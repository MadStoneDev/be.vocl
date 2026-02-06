"use server";

import { createClient } from "@/lib/supabase/server";

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
  tags: Array<{ id: string; name: string }>;
  // Recommendation metadata
  score: number;
  reason: "followed_tag" | "similar_interest" | "popular" | "followed_user";
}

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

    // Parallel fetch: Get followed tags, liked posts, follows, and user's sensitive pref
    const [followedTagsResult, likedPostsResult, followsResult, profileResult] = await Promise.all([
      supabase.from("followed_tags").select("tag_id").eq("profile_id", user.id),
      supabase.from("likes").select("post_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
      supabase.from("profiles").select("show_sensitive_posts").eq("id", user.id).single(),
    ]);

    const showSensitive = profileResult.data?.show_sensitive_posts ?? false;
    const followedTagIds = (followedTagsResult.data || []).map((ft: any) => ft.tag_id);
    const followedUserIds = (followsResult.data || []).map((f: any) => f.following_id);

    // Weight recent likes more heavily - last 20 likes get full weight
    const likedPostsWithWeight = (likedPostsResult.data || []).map((l: any, idx: number) => ({
      postId: l.post_id,
      weight: Math.max(0.2, 1 - (idx * 0.04)), // 1.0 -> 0.2 over 20 items
    }));
    const likedPostIds = likedPostsWithWeight.map((l) => l.postId);

    // Get tag IDs from liked posts with weights
    const interestTagWeights = new Map<string, number>();
    if (likedPostIds.length > 0) {
      const { data: tagsFromLiked } = await supabase
        .from("post_tags")
        .select("post_id, tag_id")
        .in("post_id", likedPostIds);

      for (const t of tagsFromLiked || []) {
        const likeWeight = likedPostsWithWeight.find((l) => l.postId === t.post_id)?.weight || 0.5;
        const existing = interestTagWeights.get(t.tag_id) || 0;
        interestTagWeights.set(t.tag_id, existing + likeWeight);
      }
    }

    const interestTagIds = [...interestTagWeights.keys()];

    // Combine all relevant tag IDs (followed tags have priority)
    const allRelevantTagIds = [...new Set([...followedTagIds, ...interestTagIds])];

    // Build post query
    let candidatePosts: any[] = [];
    const postIdsSet = new Set<string>();

    // Optimized: Fetch tagged posts directly with a single query if we have relevant tags
    if (allRelevantTagIds.length > 0) {
      // Get post IDs for tagged posts with their tag info
      const { data: taggedPostIds } = await supabase
        .from("post_tags")
        .select("post_id, tag_id")
        .in("tag_id", allRelevantTagIds);

      // Build a map of post_id -> tag_ids for scoring
      const postTagMapping = new Map<string, string[]>();
      for (const tp of taggedPostIds || []) {
        const existing = postTagMapping.get(tp.post_id) || [];
        existing.push(tp.tag_id);
        postTagMapping.set(tp.post_id, existing);
      }

      const tagPostIds = [...postTagMapping.keys()];

      if (tagPostIds.length > 0) {
        // Get recent posts (last 2 weeks for better relevance)
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const { data: tagPosts } = await supabase
          .from("posts")
          .select(`
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
          `)
          .in("id", tagPostIds.slice(0, 200))
          .eq("status", "published")
          .neq("author_id", user.id)
          .gte("created_at", twoWeeksAgo.toISOString())
          .order("created_at", { ascending: false });

        for (const post of tagPosts || []) {
          if (!postIdsSet.has(post.id)) {
            // Skip sensitive posts if user hasn't enabled them
            if (post.is_sensitive && !showSensitive) continue;

            postIdsSet.add(post.id);

            // Calculate tag relevance score
            const postTags = postTagMapping.get(post.id) || [];
            const hasFollowedTag = postTags.some((tid) => followedTagIds.includes(tid));
            const interestScore = postTags.reduce((acc, tid) => acc + (interestTagWeights.get(tid) || 0), 0);

            candidatePosts.push({
              ...post,
              reason: hasFollowedTag ? "followed_tag" : "similar_interest",
              tagRelevanceScore: hasFollowedTag ? 10 : interestScore,
              isFromFollowedUser: followedUserIds.includes(post.author_id),
            });
          }
        }
      }
    }

    // Add posts from followed users if we need more diversity
    if (followedUserIds.length > 0 && candidatePosts.length < (limit + offset) * 2) {
      const { data: followedUserPosts } = await supabase
        .from("posts")
        .select(`
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
        `)
        .in("author_id", followedUserIds)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(50);

      for (const post of followedUserPosts || []) {
        if (!postIdsSet.has(post.id)) {
          if (post.is_sensitive && !showSensitive) continue;
          postIdsSet.add(post.id);
          candidatePosts.push({
            ...post,
            reason: "followed_user",
            tagRelevanceScore: 0,
            isFromFollowedUser: true,
          });
        }
      }
    }

    // Add popular/trending posts if we still need more
    if (candidatePosts.length < (limit + offset) * 1.5) {
      const neededMore = Math.max(30, (limit + offset) * 2 - candidatePosts.length);

      const { data: popularPosts } = await supabase
        .from("posts")
        .select(`
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
        `)
        .eq("status", "published")
        .neq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(neededMore);

      for (const post of popularPosts || []) {
        if (!postIdsSet.has(post.id)) {
          if (post.is_sensitive && !showSensitive) continue;
          postIdsSet.add(post.id);
          candidatePosts.push({
            ...post,
            reason: "popular",
            tagRelevanceScore: 0,
            isFromFollowedUser: followedUserIds.includes(post.author_id),
          });
        }
      }
    }

    // Get all post IDs for batch queries
    const allPostIds = candidatePosts.map((p) => p.id);

    if (allPostIds.length === 0) {
      return { success: true, posts: [], hasMore: false };
    }

    // Batch fetch engagement data, tags, and author follower counts
    const [
      likeCounts,
      commentCounts,
      reblogCounts,
      userLikes,
      userComments,
      userReblogs,
      postTagsData,
      authorFollowerCounts,
    ] = await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", allPostIds),
      supabase.from("comments").select("post_id").in("post_id", allPostIds),
      supabase.from("posts").select("reblogged_from_id").in("reblogged_from_id", allPostIds).eq("status", "published"),
      supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", allPostIds),
      supabase.from("comments").select("post_id").eq("user_id", user.id).in("post_id", allPostIds),
      supabase.from("posts").select("reblogged_from_id").eq("author_id", user.id).in("reblogged_from_id", allPostIds).neq("status", "deleted"),
      supabase.from("post_tags").select("post_id, tag:tag_id (id, name)").in("post_id", allPostIds),
      // Get follower counts for authors to boost smaller creators
      supabase.from("follows").select("following_id").in("following_id", [...new Set(candidatePosts.map((p) => p.author_id))]),
    ]);

    // Build count maps
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
    const userLikeSet = new Set((userLikes.data || []).map((l: any) => l.post_id));
    const userCommentSet = new Set((userComments.data || []).map((c: any) => c.post_id));
    const userReblogSet = new Set((userReblogs.data || []).map((r: any) => r.reblogged_from_id));

    // Build author follower count map
    const authorFollowerCountMap = new Map<string, number>();
    for (const f of authorFollowerCounts.data || []) {
      authorFollowerCountMap.set(f.following_id, (authorFollowerCountMap.get(f.following_id) || 0) + 1);
    }

    (likeCounts.data || []).forEach((l: any) => {
      likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
    });
    (commentCounts.data || []).forEach((c: any) => {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
    });
    (reblogCounts.data || []).forEach((r: any) => {
      reblogCountMap.set(r.reblogged_from_id, (reblogCountMap.get(r.reblogged_from_id) || 0) + 1);
    });
    (postTagsData.data || []).forEach((pt: any) => {
      if (pt.tag) {
        const existing = tagsMap.get(pt.post_id) || [];
        existing.push({ id: pt.tag.id, name: pt.tag.name });
        tagsMap.set(pt.post_id, existing);
      }
    });

    // Calculate scores and format posts
    const now = Date.now();
    let scoredPosts: RecommendedPost[] = candidatePosts.map((post) => {
      const likes = likeCountMap.get(post.id) || 0;
      const comments = commentCountMap.get(post.id) || 0;
      const reblogs = reblogCountMap.get(post.id) || 0;
      const tags = tagsMap.get(post.id) || [];
      const authorFollowers = authorFollowerCountMap.get(post.author_id) || 0;

      // Base engagement score (comments and reblogs weighted higher)
      const engagementScore = likes + (comments * 2.5) + (reblogs * 4);

      // Time decay (posts lose 50% score per week)
      const postAge = now - new Date(post.published_at || post.created_at).getTime();
      const hoursOld = postAge / (1000 * 60 * 60);
      const timeDecay = Math.pow(0.5, hoursOld / 168); // 168 hours = 1 week

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
      // Creators with < 10 followers get 2x boost, gradually decreasing
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
        isOwn: false, // We exclude own posts in the query
        createdAt: formatTimeAgo(post.created_at),
        publishedAt: post.published_at || post.created_at,
        likeCount: likes,
        commentCount: comments,
        reblogCount: reblogs,
        hasLiked: userLikeSet.has(post.id),
        hasCommented: userCommentSet.has(post.id),
        hasReblogged: userReblogSet.has(post.id),
        tags,
        score,
        reason: post.reason,
      };
    });

    // Filter out posts user has already interacted with (optional: remove this to show them)
    // For now, we'll deprioritize them rather than hide completely
    scoredPosts = scoredPosts.map((post) => {
      if (post.hasLiked || post.hasCommented || post.hasReblogged) {
        return { ...post, score: post.score * 0.3 }; // Heavily deprioritize already-seen
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
      // Stop when we have enough posts for pagination
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
