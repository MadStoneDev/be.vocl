"use server";

import { createClient } from "@/lib/supabase/server";
import { batchFetchPostStats } from "@/actions/shared/post-stats";
import type { PostType } from "@/types/database";

interface ThreadPostAuthor {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: number;
}

interface ThreadPost {
  id: string;
  authorId: string;
  author: ThreadPostAuthor;
  postType: PostType;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags?: Array<{ id: string; name: string }>;
  threadId: string;
  threadPosition: number;
}

/**
 * Fetch all posts in a thread, ordered by thread_position ascending.
 * Includes author info, stats, tags, and user interaction state.
 */
export async function getPostThread(threadId: string): Promise<{
  success: boolean;
  posts?: ThreadPost[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        is_pinned,
        created_at,
        thread_id,
        thread_position,
        author:author_id (
          username,
          display_name,
          avatar_url,
          role
        )
      `
      )
      .eq("thread_id", threadId)
      .eq("status", "published")
      .order("thread_position", { ascending: true });

    if (error) {
      console.error("Get post thread error:", error);
      return { success: false, error: "Failed to fetch thread" };
    }

    if (!posts || posts.length === 0) {
      return { success: true, posts: [] };
    }

    const postIds = posts.map((p: any) => p.id);

    const stats = await batchFetchPostStats(supabase, postIds, user?.id, {
      includeTags: true,
    });

    const formattedPosts: ThreadPost[] = posts.map((post: any) => ({
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
      createdAt: post.created_at,
      likeCount: stats.likeCountMap.get(post.id) || 0,
      commentCount: stats.commentCountMap.get(post.id) || 0,
      reblogCount: stats.reblogCountMap.get(post.id) || 0,
      hasLiked: stats.userLikeSet.has(post.id),
      hasCommented: stats.userCommentSet.has(post.id),
      hasReblogged: stats.userReblogSet.has(post.id),
      tags: stats.tagsMap.get(post.id) || [],
      threadId: post.thread_id,
      threadPosition: post.thread_position,
    }));

    return { success: true, posts: formattedPosts };
  } catch (error) {
    console.error("Get post thread error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface ThreadInfo {
  threadId: string | null;
  threadPosition: number | null;
  threadLength: number;
}

/**
 * Given a post ID, check if it belongs to a thread and return thread metadata.
 * Used by feed posts to show "Thread 3/7" badges.
 */
export async function getThreadInfo(postId: string): Promise<ThreadInfo> {
  try {
    const supabase = await createClient();

    const { data: post } = await (supabase as any)
      .from("posts")
      .select("thread_id, thread_position")
      .eq("id", postId)
      .single();

    if (!post || !post.thread_id) {
      return { threadId: null, threadPosition: null, threadLength: 0 };
    }

    const { count } = await (supabase as any)
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("thread_id", post.thread_id)
      .eq("status", "published");

    return {
      threadId: post.thread_id,
      threadPosition: post.thread_position,
      threadLength: count || 0,
    };
  } catch (error) {
    console.error("Get thread info error:", error);
    return { threadId: null, threadPosition: null, threadLength: 0 };
  }
}

/**
 * Batch version: given multiple post IDs, return thread info for all of them.
 * Uses two queries: one to fetch thread_id/thread_position for the posts,
 * then one to count thread lengths grouped by thread_id.
 */
export async function getThreadInfoBatch(
  postIds: string[]
): Promise<Map<string, { threadId: string; threadPosition: number; threadLength: number }>> {
  const result = new Map<
    string,
    { threadId: string; threadPosition: number; threadLength: number }
  >();

  if (postIds.length === 0) return result;

  try {
    const supabase = await createClient();

    // 1. Fetch thread_id and thread_position for all requested posts
    const { data: posts } = await (supabase as any)
      .from("posts")
      .select("id, thread_id, thread_position")
      .in("id", postIds);

    if (!posts || posts.length === 0) return result;

    // Collect unique thread IDs (excluding nulls)
    const threadIds: string[] = [
      ...new Set<string>(
        posts
          .filter((p: any) => p.thread_id !== null)
          .map((p: any) => p.thread_id as string)
      ),
    ];

    if (threadIds.length === 0) return result;

    // 2. Count thread lengths with individual count queries per thread_id
    const countQueries = threadIds.map((tid: string) =>
      (supabase as any)
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", tid)
        .eq("status", "published")
    );

    const countResults = await Promise.all(countQueries);

    const threadLengthMap = new Map<string, number>();
    for (let i = 0; i < threadIds.length; i++) {
      threadLengthMap.set(threadIds[i], countResults[i].count || 0);
    }

    // 3. Build the result map
    for (const post of posts) {
      if (post.thread_id) {
        result.set(post.id, {
          threadId: post.thread_id,
          threadPosition: post.thread_position,
          threadLength: threadLengthMap.get(post.thread_id) || 0,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Get thread info batch error:", error);
    return result;
  }
}
