"use server";

import { createClient } from "@/lib/supabase/server";
import { batchFetchPostStats } from "@/actions/shared/post-stats";

interface RecommendedPost {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  };
  postType: string;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  publishedAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  isFollowingAuthor?: boolean;
  tags: Array<{ id: string; name: string }>;
  // Recommendation metadata
  score: number;
  reason: "followed_tag" | "similar_interest" | "popular" | "followed_user";
}

// Shared post select fields to avoid repetition
const POST_SELECT_FIELDS = `
  id,
  author_id,
  post_type,
  content,
  is_sensitive,
  is_pinned,
  created_at,
  published_at,
  author:author_id (
    username,
    display_name,
    avatar_url,
    role
  )
`;

/**
 * Get personalized feed recommendations
 *
 * Algorithm:
 * 1. Get posts from tags the user follows (highest weight)
 * 2. Get posts similar to what user has liked (tag-based)
 * 3. Get posts from users the user follows
 * 4. Apply engagement scoring with time decay
 * 5. Add freshness bonus for very recent posts
 * 6. Filter out posts user has already interacted with
 * 7. Limit posts per author for diversity
 * 8. Boost posts from smaller creators
 */
export async function getPersonalizedFeed(options?: {
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  posts?: RecommendedPost[];
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Phase 1: Parallel fetch user preferences (4 queries -> 1 round-trip)
    const [followedTagsResult, likedPostsResult, followsResult, profileResult, mutesResult] = await Promise.all([
      supabase.from("followed_tags").select("tag_id").eq("profile_id", user.id),
      supabase.from("likes").select("post_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("profiles").select("show_sensitive_posts").eq("id", user.id).single(),
      supabase.from("mutes").select("muted_id").eq("muter_id", user.id),
    ]);
    const mutedUserIds = new Set((mutesResult.data || []).map((m: any) => m.muted_id));

    const showSensitive = profileResult.data?.show_sensitive_posts ?? false;
    const followedTagIds = (followedTagsResult.data || []).map((ft: any) => ft.tag_id);
    const followedUserIds = (followsResult.data || []).map((f: any) => f.following_id);

    // Weight recent likes more heavily - last 20 likes get full weight
    const likedPostsWithWeight = (likedPostsResult.data || []).map((l: any, idx: number) => ({
      postId: l.post_id,
      weight: Math.max(0.2, 1 - (idx * 0.04)),
    }));
    const likedPostIds = likedPostsWithWeight.map((l) => l.postId);

    // Phase 2: Get tag interests + fetch candidate posts in parallel where possible
    const interestTagWeights = new Map<string, number>();
    let taggedPostMapping = new Map<string, string[]>();

    // Build interest tag weights from liked posts AND get tagged post IDs in parallel
    const phase2Queries: Promise<any>[] = [];

    if (likedPostIds.length > 0) {
      phase2Queries.push(
        (supabase as any).from("post_tags").select("post_id, tag_id").in("post_id", likedPostIds)
      );
    } else {
      phase2Queries.push(Promise.resolve({ data: [] }));
    }

    const allRelevantTagIds = [...new Set([...followedTagIds])]; // Start with followed, add interest tags after

    // We'll also fetch tagged posts if we have followed tags
    if (followedTagIds.length > 0) {
      phase2Queries.push(
        (supabase as any).from("post_tags").select("post_id, tag_id").in("tag_id", followedTagIds)
      );
    } else {
      phase2Queries.push(Promise.resolve({ data: [] }));
    }

    const [tagsFromLikedResult, followedTagPostsResult] = await Promise.all(phase2Queries);

    // Process interest tags from liked posts
    for (const t of tagsFromLikedResult.data || []) {
      const likeWeight = likedPostsWithWeight.find((l) => l.postId === t.post_id)?.weight || 0.5;
      const existing = interestTagWeights.get(t.tag_id) || 0;
      interestTagWeights.set(t.tag_id, existing + likeWeight);
    }

    const interestTagIds = [...interestTagWeights.keys()];
    const combinedRelevantTagIds = [...new Set([...followedTagIds, ...interestTagIds])];

    // Build post-tag mapping from followed tags
    for (const tp of followedTagPostsResult.data || []) {
      const existing = taggedPostMapping.get(tp.post_id) || [];
      existing.push(tp.tag_id);
      taggedPostMapping.set(tp.post_id, existing);
    }

    // If we have interest tags that aren't in followed tags, fetch those post mappings too
    const extraInterestTagIds = interestTagIds.filter((id) => !followedTagIds.includes(id));
    if (extraInterestTagIds.length > 0) {
      const { data: extraTagPosts } = await (supabase as any)
        .from("post_tags")
        .select("post_id, tag_id")
        .in("tag_id", extraInterestTagIds);

      for (const tp of extraTagPosts || []) {
        const existing = taggedPostMapping.get(tp.post_id) || [];
        existing.push(tp.tag_id);
        taggedPostMapping.set(tp.post_id, existing);
      }
    }

    // Phase 3: Fetch all candidate posts in parallel
    const candidatePosts: any[] = [];
    const postIdsSet = new Set<string>();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const tagPostIds = [...taggedPostMapping.keys()];
    const phase3Queries: Promise<any>[] = [];

    // Query 1: Tagged posts (from followed tags + interest tags)
    if (tagPostIds.length > 0) {
      phase3Queries.push(
        (supabase as any)
          .from("posts")
          .select(POST_SELECT_FIELDS)
          .in("id", tagPostIds.slice(0, 200))
          .eq("status", "published")
          .neq("author_id", user.id)
          .gte("created_at", twoWeeksAgo.toISOString())
          .order("created_at", { ascending: false })
      );
    } else {
      phase3Queries.push(Promise.resolve({ data: [] }));
    }

    // Query 2: Followed user posts
    if (followedUserIds.length > 0) {
      phase3Queries.push(
        (supabase as any)
          .from("posts")
          .select(POST_SELECT_FIELDS)
          .in("author_id", followedUserIds)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(50)
      );
    } else {
      phase3Queries.push(Promise.resolve({ data: [] }));
    }

    // Query 3: Popular/trending posts (always fetch as fallback)
    phase3Queries.push(
      (supabase as any)
        .from("posts")
        .select(POST_SELECT_FIELDS)
        .eq("status", "published")
        .neq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
    );

    // Execute all 3 candidate queries in a single parallel round-trip
    const [tagPostsResult, followedUserPostsResult, popularPostsResult] = await Promise.all(phase3Queries);

    // Process tagged posts
    for (const post of tagPostsResult.data || []) {
      if (postIdsSet.has(post.id)) continue;
      if (mutedUserIds.has(post.author_id)) continue;
      if (post.is_sensitive && !showSensitive) continue;

      postIdsSet.add(post.id);
      const postTags = taggedPostMapping.get(post.id) || [];
      const hasFollowedTag = postTags.some((tid) => followedTagIds.includes(tid));
      const interestScore = postTags.reduce((acc, tid) => acc + (interestTagWeights.get(tid) || 0), 0);

      candidatePosts.push({
        ...post,
        reason: hasFollowedTag ? "followed_tag" : "similar_interest",
        tagRelevanceScore: hasFollowedTag ? 10 : interestScore,
        isFromFollowedUser: followedUserIds.includes(post.author_id),
      });
    }

    // Process followed user posts
    for (const post of followedUserPostsResult.data || []) {
      if (postIdsSet.has(post.id)) continue;
      if (mutedUserIds.has(post.author_id)) continue;
      if (post.is_sensitive && !showSensitive) continue;

      postIdsSet.add(post.id);
      candidatePosts.push({
        ...post,
        reason: "followed_user" as const,
        tagRelevanceScore: 0,
        isFromFollowedUser: true,
      });
    }

    // Process popular posts (fill remaining slots)
    for (const post of popularPostsResult.data || []) {
      if (postIdsSet.has(post.id)) continue;
      if (mutedUserIds.has(post.author_id)) continue;
      if (post.is_sensitive && !showSensitive) continue;

      postIdsSet.add(post.id);
      candidatePosts.push({
        ...post,
        reason: "popular" as const,
        tagRelevanceScore: 0,
        isFromFollowedUser: followedUserIds.includes(post.author_id),
      });
    }

    const allPostIds = candidatePosts.map((p) => p.id);

    if (allPostIds.length === 0) {
      return { success: true, posts: [], hasMore: false };
    }

    // Phase 4: Batch fetch engagement data + author follower counts in parallel
    const uniqueAuthorIds = [...new Set(candidatePosts.map((p) => p.author_id))];

    // Use individual count queries per author (bounded by unique authors, not all followers)
    const [stats, ...authorCountResults] = await Promise.all([
      batchFetchPostStats(supabase, allPostIds, user.id, { includeTags: true }),
      ...uniqueAuthorIds.map((authorId) =>
        (supabase as any).from("follows").select("*", { count: "exact", head: true }).eq("following_id", authorId)
      ),
    ]);

    // Build author follower count map
    const authorFollowerCountMap = new Map<string, number>();
    uniqueAuthorIds.forEach((authorId, i) => {
      authorFollowerCountMap.set(authorId, authorCountResults[i].count || 0);
    });

    // Calculate scores and format posts
    const now = Date.now();
    let scoredPosts: RecommendedPost[] = candidatePosts.map((post) => {
      const likes = stats.likeCountMap.get(post.id) || 0;
      const comments = stats.commentCountMap.get(post.id) || 0;
      const reblogs = stats.reblogCountMap.get(post.id) || 0;
      const tags = stats.tagsMap.get(post.id) || [];
      const authorFollowers = authorFollowerCountMap.get(post.author_id) || 0;

      // Base engagement score (comments and reblogs weighted higher)
      const engagementScore = likes + (comments * 2.5) + (reblogs * 4);

      // Time decay (posts lose 50% score per week)
      const postAge = now - new Date(post.published_at || post.created_at).getTime();
      const hoursOld = postAge / (1000 * 60 * 60);
      const timeDecay = Math.pow(0.5, hoursOld / 168);

      // Freshness bonus for very recent posts (< 6 hours)
      const freshnessBonus = hoursOld < 6 ? 2.0 : hoursOld < 24 ? 1.5 : 1.0;

      // Reason bonus based on source
      let reasonBonus = 1;
      if (post.reason === "followed_tag") reasonBonus = 4;
      else if (post.reason === "similar_interest") reasonBonus = 2.5;
      else if (post.reason === "followed_user") reasonBonus = 2;

      // Tag relevance bonus
      const tagBonus = 1 + (post.tagRelevanceScore || 0) * 0.1;

      // Small creator boost (inverse of follower count, capped)
      const creatorBoost = Math.max(1, 2 - (authorFollowers / 20));

      // Followed user gets a boost
      const followedUserBonus = post.isFromFollowedUser ? 1.5 : 1;

      // Check if post has any followed tags (re-verify)
      const hasFollowedTag = tags.some((t) => followedTagIds.includes(t.id));
      if (hasFollowedTag && post.reason !== "followed_tag") {
        post.reason = "followed_tag";
        reasonBonus = 4;
      }

      const score = (engagementScore + 1) * timeDecay * freshnessBonus * reasonBonus * tagBonus * creatorBoost * followedUserBonus;

      return {
        id: post.id,
        authorId: post.author_id,
        author: {
          username: post.author?.username || "unknown",
          displayName: post.author?.display_name,
          avatarUrl: post.author?.avatar_url,
          role: post.author?.role || 0,
        },
        postType: post.post_type,
        content: post.content,
        isSensitive: post.is_sensitive,
        isPinned: post.is_pinned,
        isOwn: false,
        isFollowingAuthor: followedUserIds.includes(post.author_id),
        createdAt: formatTimeAgo(post.created_at),
        publishedAt: post.published_at || post.created_at,
        likeCount: likes,
        commentCount: comments,
        reblogCount: reblogs,
        hasLiked: stats.userLikeSet.has(post.id),
        hasCommented: stats.userCommentSet.has(post.id),
        hasReblogged: stats.userReblogSet.has(post.id),
        tags,
        score,
        reason: post.reason,
      };
    });

    // Deprioritize already-interacted posts
    scoredPosts = scoredPosts.map((post) => {
      if (post.hasLiked || post.hasCommented || post.hasReblogged) {
        return { ...post, score: post.score * 0.3 };
      }
      return post;
    });

    // Sort by score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply author diversity: limit to max 2 posts per author in the final result
    const authorPostCount = new Map<string, number>();
    const diversePosts: RecommendedPost[] = [];

    for (const post of scoredPosts) {
      const currentCount = authorPostCount.get(post.authorId) || 0;
      if (currentCount < 2) {
        diversePosts.push(post);
        authorPostCount.set(post.authorId, currentCount + 1);
      }
      if (diversePosts.length >= offset + limit + 10) break;
    }

    // Apply pagination
    const paginatedPosts = diversePosts.slice(offset, offset + limit);

    return {
      success: true,
      posts: paginatedPosts,
      hasMore: diversePosts.length > offset + limit,
    };
  } catch (error) {
    console.error("Get personalized feed error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get trending posts based on engagement velocity
 *
 * Algorithm:
 * 1. Fetch posts from last 48 hours
 * 2. Score by engagement velocity (likes + comments*2.5 + reblogs*4)
 * 3. Apply time decay (recent engagement weighted higher)
 * 4. Mild boost for posts matching user interests (not strict)
 * 5. Exclude posts user has already seen/interacted with heavily
 */
export async function getTrendingFeed(options?: {
  limit?: number;
  offset?: number;
}): Promise<{
  success: boolean;
  posts?: any[];
  hasMore?: boolean;
  trendingTags?: Array<{ id: string; name: string; postCount: number }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Phase 1: Fetch user preferences (if logged in) in parallel
    let followedTagIds: string[] = [];
    let followedUserIds: string[] = [];
    let mutedUserIds = new Set<string>();
    let showSensitive = false;

    if (user) {
      const [followedTagsResult, followsResult, mutesResult, profileResult] = await Promise.all([
        supabase.from("followed_tags").select("tag_id").eq("profile_id", user.id),
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("mutes").select("muted_id").eq("muter_id", user.id),
        supabase.from("profiles").select("show_sensitive_posts").eq("id", user.id).single(),
      ]);

      followedTagIds = (followedTagsResult.data || []).map((ft: any) => ft.tag_id);
      followedUserIds = (followsResult.data || []).map((f: any) => f.following_id);
      mutedUserIds = new Set((mutesResult.data || []).map((m: any) => m.muted_id));
      showSensitive = profileResult.data?.show_sensitive_posts ?? false;
    }

    // Phase 2: Fetch candidate posts from last 48 hours
    const twoDaysAgo = new Date();
    twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

    let postsQuery = (supabase as any)
      .from("posts")
      .select(POST_SELECT_FIELDS)
      .eq("status", "published")
      .gte("created_at", twoDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(100);

    const { data: rawPosts, error: postsError } = await postsQuery;

    if (postsError) {
      console.error("Trending feed posts query error:", postsError);
      return { success: false, error: "Failed to fetch trending posts" };
    }

    // Filter out muted users and sensitive content
    let candidatePosts = (rawPosts || []).filter((post: any) => {
      if (mutedUserIds.has(post.author_id)) return false;
      if (post.is_sensitive && !showSensitive) return false;
      return true;
    });

    if (candidatePosts.length === 0) {
      return { success: true, posts: [], hasMore: false, trendingTags: [] };
    }

    const allPostIds = candidatePosts.map((p: any) => p.id);

    // Phase 3: Batch fetch engagement stats + trending tags in parallel
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const [stats, trendingTagsResult] = await Promise.all([
      batchFetchPostStats(supabase, allPostIds, user?.id, { includeTags: true }),
      (supabase as any)
        .from("post_tags")
        .select("tag_id, tags!inner(id, name)")
        .gte("created_at", oneDayAgo.toISOString()),
    ]);

    // Build trending tags: count occurrences per tag from last 24h
    const tagCountMap = new Map<string, { id: string; name: string; count: number }>();
    for (const row of trendingTagsResult.data || []) {
      const tag = row.tags;
      if (!tag) continue;
      const existing = tagCountMap.get(tag.id);
      if (existing) {
        existing.count++;
      } else {
        tagCountMap.set(tag.id, { id: tag.id, name: tag.name, count: 1 });
      }
    }
    const trendingTags = [...tagCountMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((t) => ({ id: t.id, name: t.name, postCount: t.count }));

    // Build a set of followed tag IDs for interest boost
    const followedTagSet = new Set(followedTagIds);

    // Phase 4: Score each post
    const now = Date.now();
    const scoredPosts = candidatePosts.map((post: any) => {
      const likes = stats.likeCountMap.get(post.id) || 0;
      const comments = stats.commentCountMap.get(post.id) || 0;
      const reblogs = stats.reblogCountMap.get(post.id) || 0;
      const tags = stats.tagsMap.get(post.id) || [];

      // Base engagement score
      const engagementScore = likes + comments * 2.5 + reblogs * 4;

      // Time decay: 30% decay per day
      const postAge = now - new Date(post.published_at || post.created_at).getTime();
      const hoursOld = postAge / (1000 * 60 * 60);
      const timeDecay = Math.pow(0.7, hoursOld / 24);

      // Mild interest boost if post has tags matching user's followed tags
      const hasMatchingTag = tags.some((t: { id: string }) => followedTagSet.has(t.id));
      const interestBoost = hasMatchingTag ? 1.3 : 1.0;

      const score = (engagementScore + 1) * timeDecay * interestBoost;

      return {
        post,
        tags,
        likes,
        comments,
        reblogs,
        score,
      };
    });

    // Sort by score descending
    scoredPosts.sort((a: any, b: any) => b.score - a.score);

    // Apply author diversity: max 2 posts per author
    const authorPostCount = new Map<string, number>();
    const diversePosts: any[] = [];

    for (const item of scoredPosts) {
      const authorId = item.post.author_id;
      const currentCount = authorPostCount.get(authorId) || 0;
      if (currentCount < 2) {
        diversePosts.push(item);
        authorPostCount.set(authorId, currentCount + 1);
      }
      if (diversePosts.length >= offset + limit + 10) break;
    }

    // Paginate
    const paginatedItems = diversePosts.slice(offset, offset + limit);

    // Format posts in the same shape as getPersonalizedFeed
    const formattedPosts: RecommendedPost[] = paginatedItems.map((item: any) => {
      const post = item.post;
      return {
        id: post.id,
        authorId: post.author_id,
        author: {
          username: post.author?.username || "unknown",
          displayName: post.author?.display_name,
          avatarUrl: post.author?.avatar_url,
          role: post.author?.role || 0,
        },
        postType: post.post_type,
        content: post.content,
        isSensitive: post.is_sensitive,
        isPinned: post.is_pinned,
        isOwn: user ? post.author_id === user.id : false,
        isFollowingAuthor: followedUserIds.includes(post.author_id),
        createdAt: formatTimeAgo(post.created_at),
        publishedAt: post.published_at || post.created_at,
        likeCount: item.likes,
        commentCount: item.comments,
        reblogCount: item.reblogs,
        hasLiked: user ? stats.userLikeSet.has(post.id) : false,
        hasCommented: user ? stats.userCommentSet.has(post.id) : false,
        hasReblogged: user ? stats.userReblogSet.has(post.id) : false,
        tags: item.tags,
        score: item.score,
        reason: "popular" as const,
      };
    });

    return {
      success: true,
      posts: formattedPosts,
      hasMore: diversePosts.length > offset + limit,
      trendingTags,
    };
  } catch (error) {
    console.error("Get trending feed error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
