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
 * Get all bookmark collections for the current user
 */
export async function getBookmarkCollections(): Promise<{
  success: boolean;
  collections?: Array<{
    id: string;
    name: string;
    description: string | null;
    bookmarkCount: number;
    createdAt: string;
  }>;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch collections
    const { data: collections, error } = await (supabase as any)
      .from("bookmark_collections")
      .select("id, name, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Get bookmark collections error:", error);
      return { success: false, error: "Failed to fetch collections" };
    }

    // Count bookmarks per collection
    const collectionIds = (collections || []).map((c: any) => c.id);
    let countMap: Record<string, number> = {};

    if (collectionIds.length > 0) {
      const { data: counts } = await (supabase as any)
        .from("bookmarks")
        .select("collection_id")
        .eq("user_id", user.id)
        .in("collection_id", collectionIds);

      if (counts) {
        for (const row of counts) {
          if (row.collection_id) {
            countMap[row.collection_id] = (countMap[row.collection_id] || 0) + 1;
          }
        }
      }
    }

    return {
      success: true,
      collections: (collections || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        bookmarkCount: countMap[c.id] || 0,
        createdAt: c.created_at,
      })),
    };
  } catch (error) {
    console.error("Get bookmark collections error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Create a new bookmark collection
 */
export async function createBookmarkCollection(
  name: string,
  description?: string
): Promise<{
  success: boolean;
  collectionId?: string;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate name
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return { success: false, error: "Collection name must be 1-50 characters" };
    }

    // Check collection limit (max 20 per user)
    const { count } = await (supabase as any)
      .from("bookmark_collections")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count !== null && count >= 20) {
      return { success: false, error: "Maximum of 20 collections reached" };
    }

    const { data, error } = await (supabase as any)
      .from("bookmark_collections")
      .insert({
        user_id: user.id,
        name: trimmedName,
        description: description?.trim() || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Create bookmark collection error:", error);
      return { success: false, error: "Failed to create collection" };
    }

    return { success: true, collectionId: data.id };
  } catch (error) {
    console.error("Create bookmark collection error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Rename a bookmark collection
 */
export async function renameBookmarkCollection(
  collectionId: string,
  name: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 50) {
      return { success: false, error: "Collection name must be 1-50 characters" };
    }

    const { error } = await (supabase as any)
      .from("bookmark_collections")
      .update({ name: trimmedName })
      .eq("id", collectionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Rename bookmark collection error:", error);
      return { success: false, error: "Failed to rename collection" };
    }

    return { success: true };
  } catch (error) {
    console.error("Rename bookmark collection error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a bookmark collection (bookmarks in it become uncollected, not deleted)
 */
export async function deleteBookmarkCollection(
  collectionId: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Set collection_id to null on all bookmarks in this collection
    await (supabase as any)
      .from("bookmarks")
      .update({ collection_id: null })
      .eq("collection_id", collectionId)
      .eq("user_id", user.id);

    // Delete the collection
    const { error } = await (supabase as any)
      .from("bookmark_collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete bookmark collection error:", error);
      return { success: false, error: "Failed to delete collection" };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete bookmark collection error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Move a bookmark to a collection (or remove from collection by passing null)
 */
export async function moveBookmarkToCollection(
  postId: string,
  collectionId: string | null
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate collection ownership if collectionId is provided
    if (collectionId) {
      const { data: collection } = await (supabase as any)
        .from("bookmark_collections")
        .select("id")
        .eq("id", collectionId)
        .eq("user_id", user.id)
        .single();

      if (!collection) {
        return { success: false, error: "Collection not found" };
      }
    }

    // Update the bookmark's collection_id
    const { error } = await (supabase as any)
      .from("bookmarks")
      .update({ collection_id: collectionId })
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Move bookmark to collection error:", error);
      return { success: false, error: "Failed to move bookmark" };
    }

    return { success: true };
  } catch (error) {
    console.error("Move bookmark to collection error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get bookmarks for a specific collection (or uncollected if collectionId is "uncollected")
 */
export async function getBookmarksByCollection(
  collectionId: string | null,
  options?: { limit?: number; offset?: number }
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

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    let query = (supabase as any)
      .from("bookmarks")
      .select(`
        id,
        collection_id,
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

    if (collectionId === "uncollected") {
      query = query.is("collection_id", null);
    } else if (collectionId) {
      query = query.eq("collection_id", collectionId);
    }
    // If collectionId is null, return all bookmarks (no filter)

    const { data, error } = await query;

    if (error) {
      console.error("Get bookmarks by collection error:", error);
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
        collectionId: b.collection_id,
        likeCount: stats.likeCountMap.get(post.id) || 0,
        commentCount: stats.commentCountMap.get(post.id) || 0,
        reblogCount: stats.reblogCountMap.get(post.id) || 0,
        hasLiked: stats.userLikeSet.has(post.id),
        hasCommented: stats.userCommentSet.has(post.id),
        hasReblogged: stats.userReblogSet.has(post.id),
        hasBookmarked: true,
        tags: stats.tagsMap.get(post.id) || [],
      };
    });

    return {
      success: true,
      bookmarks,
      hasMore: (data || []).length > limit,
    };
  } catch (error) {
    console.error("Get bookmarks by collection error:", error);
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
