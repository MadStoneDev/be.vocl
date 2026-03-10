"use server";

import { requireAuth } from "./shared/auth";

interface BookmarkResult {
  success: boolean;
  bookmarked?: boolean;
  error?: string;
}

/**
 * Toggle bookmark on a post (bookmark if not bookmarked, remove if already bookmarked)
 */
export async function toggleBookmark(postId: string): Promise<BookmarkResult> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if already bookmarked
    const { data: existing } = await (supabase as any)
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("post_id", postId)
      .single();

    if (existing) {
      // Remove bookmark
      const { error } = await (supabase as any)
        .from("bookmarks")
        .delete()
        .eq("id", existing.id);

      if (error) {
        console.error("Remove bookmark error:", error);
        return { success: false, error: "Failed to remove bookmark" };
      }

      return { success: true, bookmarked: false };
    } else {
      // Add bookmark
      const { error } = await (supabase as any)
        .from("bookmarks")
        .insert({
          user_id: user.id,
          post_id: postId,
        });

      if (error) {
        console.error("Add bookmark error:", error);
        return { success: false, error: "Failed to bookmark" };
      }

      return { success: true, bookmarked: true };
    }
  } catch (error) {
    console.error("Toggle bookmark error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get paginated bookmarks for the current user with full post data
 */
export async function getBookmarksByUser(
  limit = 20,
  offset = 0
): Promise<{
  success: boolean;
  bookmarks?: any[];
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await (supabase as any)
      .from("bookmarks")
      .select(`
        id,
        created_at,
        post:post_id (
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          is_pinned,
          status,
          created_at,
          author:author_id (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      console.error("Get bookmarks error:", error);
      return { success: false, error: "Failed to fetch bookmarks" };
    }

    // Filter out deleted/draft posts and map to expected shape
    const validBookmarks = (data || []).filter(
      (b: any) => b.post && b.post.status === "published"
    );

    // Get post IDs for batch stat fetching
    const postIds = validBookmarks.map((b: any) => b.post.id);

    // Batch fetch stats
    const { batchFetchPostStats } = await import("./shared/post-stats");
    const stats = await batchFetchPostStats(supabase, postIds, user.id, { includeTags: true });

    const bookmarks = validBookmarks.map((b: any) => {
      const post = b.post;
      const author = post.author;
      return {
        id: post.id,
        authorId: post.author_id,
        author: {
          username: author?.username || "unknown",
          displayName: author?.display_name || null,
          avatarUrl: author?.avatar_url || null,
          role: author?.role || 0,
        },
        postType: post.post_type,
        content: post.content,
        isSensitive: post.is_sensitive || false,
        isPinned: post.is_pinned || false,
        isOwn: post.author_id === user.id,
        createdAt: post.created_at,
        likeCount: stats.likeCountMap.get(post.id) || 0,
        commentCount: stats.commentCountMap.get(post.id) || 0,
        reblogCount: stats.reblogCountMap.get(post.id) || 0,
        hasLiked: stats.userLikeSet.has(post.id),
        hasCommented: stats.userCommentSet.has(post.id),
        hasReblogged: stats.userReblogSet.has(post.id),
        hasBookmarked: true, // All results are bookmarked by definition
        tags: stats.tagsMap.get(post.id) || [],
      };
    });

    return {
      success: true,
      bookmarks,
      hasMore: (data || []).length > limit,
    };
  } catch (error) {
    console.error("Get bookmarks error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Batch check if user has bookmarked given post IDs.
 * Returns a Set of post IDs that are bookmarked.
 */
export async function batchCheckBookmarks(postIds: string[]): Promise<Set<string>> {
  try {
    if (postIds.length === 0) return new Set();

    const { user, supabase } = await requireAuth();
    if (!user) return new Set();

    const { data } = await (supabase as any)
      .from("bookmarks")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", postIds);

    return new Set((data || []).map((b: any) => b.post_id));
  } catch {
    return new Set();
  }
}
