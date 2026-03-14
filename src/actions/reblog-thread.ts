"use server";

import { createClient } from "@/lib/supabase/server";

interface ReblogThreadEntry {
  id: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  reblogComment: string | null;
  postType: string;
  content: any;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  depth: number;
}

interface ReblogThreadResult {
  success: boolean;
  thread: ReblogThreadEntry[];
  error?: string;
}

/**
 * Given any post in a reblog chain, reconstruct the full thread
 * ordered chronologically with depth info for nesting.
 */
export async function getReblogThread(
  postId: string
): Promise<ReblogThreadResult> {
  try {
    const supabase = await createClient();

    // 1. Fetch the given post to determine the original
    const { data: currentPost, error: fetchError } = await (supabase as any)
      .from("posts")
      .select("id, original_post_id")
      .eq("id", postId)
      .single();

    if (fetchError || !currentPost) {
      return { success: false, thread: [], error: "Post not found" };
    }

    const originalId = currentPost.original_post_id || currentPost.id;

    // 2. Fetch the original post with author profile
    const { data: originalPost, error: originalError } = await (supabase as any)
      .from("posts")
      .select(`
        id,
        author_id,
        post_type,
        content,
        reblog_comment_html,
        reblogged_from_id,
        original_post_id,
        created_at,
        like_count,
        comment_count,
        reblog_count,
        author:author_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("id", originalId)
      .single();

    if (originalError || !originalPost) {
      return { success: false, thread: [], error: "Original post not found" };
    }

    // 3. Fetch all reblogs of this original
    const { data: reblogs, error: reblogsError } = await (supabase as any)
      .from("posts")
      .select(`
        id,
        author_id,
        post_type,
        content,
        reblog_comment_html,
        reblogged_from_id,
        original_post_id,
        created_at,
        like_count,
        comment_count,
        reblog_count,
        author:author_id (
          username,
          display_name,
          avatar_url
        )
      `)
      .eq("original_post_id", originalId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (reblogsError) {
      return { success: false, thread: [], error: "Failed to fetch reblogs" };
    }

    // 4. Build the tree and compute depths
    const allPosts = [originalPost, ...(reblogs || [])];
    const postMap = new Map<string, any>();
    const childrenMap = new Map<string, string[]>();

    for (const post of allPosts) {
      postMap.set(post.id, post);
      childrenMap.set(post.id, []);
    }

    // Build parent-child relationships
    for (const post of allPosts) {
      if (post.reblogged_from_id && childrenMap.has(post.reblogged_from_id)) {
        childrenMap.get(post.reblogged_from_id)!.push(post.id);
      }
    }

    // 5. BFS/DFS to compute depths and produce a flat ordered list
    const thread: ReblogThreadEntry[] = [];
    const visited = new Set<string>();

    function traverse(nodeId: string, depth: number) {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const post = postMap.get(nodeId);
      if (!post) return;

      thread.push({
        id: post.id,
        authorUsername: post.author?.username || "unknown",
        authorDisplayName: post.author?.display_name || null,
        authorAvatarUrl: post.author?.avatar_url || null,
        reblogComment: post.reblog_comment_html || null,
        postType: post.post_type,
        content: post.content,
        createdAt: post.created_at,
        likeCount: post.like_count || 0,
        commentCount: post.comment_count || 0,
        reblogCount: post.reblog_count || 0,
        depth,
      });

      // Traverse children sorted by created_at
      const children = childrenMap.get(nodeId) || [];
      children.sort((a: string, b: string) => {
        const postA = postMap.get(a);
        const postB = postMap.get(b);
        return new Date(postA.created_at).getTime() - new Date(postB.created_at).getTime();
      });

      for (const childId of children) {
        traverse(childId, depth + 1);
      }
    }

    // Start from the original
    traverse(originalId, 0);

    // Any reblogs whose reblogged_from_id isn't in the chain
    // (e.g. parent was deleted) — add them at depth 1
    for (const post of allPosts) {
      if (!visited.has(post.id)) {
        thread.push({
          id: post.id,
          authorUsername: post.author?.username || "unknown",
          authorDisplayName: post.author?.display_name || null,
          authorAvatarUrl: post.author?.avatar_url || null,
          reblogComment: post.reblog_comment_html || null,
          postType: post.post_type,
          content: post.content,
          createdAt: post.created_at,
          likeCount: post.like_count || 0,
          commentCount: post.comment_count || 0,
          reblogCount: post.reblog_count || 0,
          depth: 1,
        });
      }
    }

    return { success: true, thread };
  } catch (error) {
    console.error("Get reblog thread error:", error);
    return { success: false, thread: [], error: "An unexpected error occurred" };
  }
}
