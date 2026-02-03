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
 * 3. Get posts from users similar to who they follow
 * 4. Apply engagement scoring with time decay
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

    // Parallel fetch: Get followed tags, liked posts, and follows all at once
    const [followedTagsResult, likedPostsResult, followsResult] = await Promise.all([
      supabase.from("followed_tags").select("tag_id").eq("profile_id", user.id),
      supabase.from("likes").select("post_id").eq("user_id", user.id).limit(50),
      supabase.from("follows").select("following_id").eq("follower_id", user.id),
    ]);

    const followedTagIds = (followedTagsResult.data || []).map((ft: any) => ft.tag_id);
    const likedPostIds = (likedPostsResult.data || []).map((l: any) => l.post_id);
    const followedUserIds = (followsResult.data || []).map((f: any) => f.following_id);

    // Get tag IDs from liked posts (only if there are liked posts)
    let interestTagIds: string[] = [];
    if (likedPostIds.length > 0) {
      const { data: tagsFromLiked } = await supabase
        .from("post_tags")
        .select("tag_id")
        .in("post_id", likedPostIds);

      interestTagIds = [...new Set((tagsFromLiked || []).map((t: any) => t.tag_id))];
    }

    // Combine all relevant tag IDs (followed tags have priority)
    const allRelevantTagIds = [...new Set([...followedTagIds, ...interestTagIds])];

    // Build post query
    let candidatePosts: any[] = [];
    const postIdsSet = new Set<string>();

    // Optimized: Fetch tagged posts directly with a single query if we have relevant tags
    if (allRelevantTagIds.length > 0) {
      // Get post IDs for tagged posts
      const { data: taggedPostIds } = await supabase
        .from("post_tags")
        .select("post_id")
        .in("tag_id", allRelevantTagIds);

      const tagPostIds = [...new Set((taggedPostIds || []).map((tp: any) => tp.post_id))];

      if (tagPostIds.length > 0) {
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
          .in("id", tagPostIds.slice(0, 100))
          .eq("status", "published")
          .neq("author_id", user.id)
          .order("created_at", { ascending: false });

        for (const post of tagPosts || []) {
          if (!postIdsSet.has(post.id)) {
            postIdsSet.add(post.id);
            candidatePosts.push({
              ...post,
              reason: "followed_tag" as const,
            });
          }
        }
      }
    }

    // Add popular posts if we need more
    if (candidatePosts.length < limit + offset) {
      const neededMore = (limit + offset) - candidatePosts.length + 20;

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
          postIdsSet.add(post.id);
          candidatePosts.push({
            ...post,
            reason: followedUserIds.includes(post.author_id) ? "followed_user" : "popular",
          });
        }
      }
    }

    // Get all post IDs for batch queries
    const allPostIds = candidatePosts.map((p) => p.id);

    if (allPostIds.length === 0) {
      return { success: true, posts: [], hasMore: false };
    }

    // Batch fetch engagement data and tags
    const [likeCounts, commentCounts, reblogCounts, userLikes, userComments, userReblogs, postTagsData] = await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", allPostIds),
      supabase.from("comments").select("post_id").in("post_id", allPostIds),
      supabase.from("posts").select("reblogged_from_id").in("reblogged_from_id", allPostIds).eq("status", "published"),
      supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", allPostIds),
      supabase.from("comments").select("post_id").eq("user_id", user.id).in("post_id", allPostIds),
      supabase.from("posts").select("reblogged_from_id").eq("author_id", user.id).in("reblogged_from_id", allPostIds).neq("status", "deleted"),
      supabase.from("post_tags").select("post_id, tag:tag_id (id, name)").in("post_id", allPostIds),
    ]);

    // Build count maps
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
    const userLikeSet = new Set((userLikes.data || []).map((l: any) => l.post_id));
    const userCommentSet = new Set((userComments.data || []).map((c: any) => c.post_id));
    const userReblogSet = new Set((userReblogs.data || []).map((r: any) => r.reblogged_from_id));

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
    const scoredPosts: RecommendedPost[] = candidatePosts.map((post) => {
      const likes = likeCountMap.get(post.id) || 0;
      const comments = commentCountMap.get(post.id) || 0;
      const reblogs = reblogCountMap.get(post.id) || 0;
      const tags = tagsMap.get(post.id) || [];

      // Engagement score
      const engagementScore = likes + (comments * 2) + (reblogs * 3);

      // Time decay (posts lose 50% score per week)
      const postAge = now - new Date(post.published_at || post.created_at).getTime();
      const hoursOld = postAge / (1000 * 60 * 60);
      const timeDecay = Math.pow(0.5, hoursOld / 168); // 168 hours = 1 week

      // Reason bonus
      let reasonBonus = 1;
      if (post.reason === "followed_tag") reasonBonus = 3;
      else if (post.reason === "similar_interest") reasonBonus = 2;
      else if (post.reason === "followed_user") reasonBonus = 1.5;

      // Check if post has any followed tags
      const hasFollowedTag = tags.some((t) => followedTagIds.includes(t.id));
      if (hasFollowedTag) {
        post.reason = "followed_tag";
        reasonBonus = 3;
      }

      const score = (engagementScore + 1) * timeDecay * reasonBonus;

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

    // Sort by score descending
    scoredPosts.sort((a, b) => b.score - a.score);

    // Apply pagination
    const paginatedPosts = scoredPosts.slice(offset, offset + limit);

    return {
      success: true,
      posts: paginatedPosts,
      hasMore: scoredPosts.length > offset + limit,
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
