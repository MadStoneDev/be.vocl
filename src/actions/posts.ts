"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/sightengine/client";
import type {
  PostType,
  PostContent,
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
} from "@/types/database";

interface CreatePostInput {
  postType: PostType;
  content: PostContent;
  isSensitive?: boolean;
  tags?: string[];
  publishMode?: "now" | "queue" | "schedule";
  scheduledFor?: string;
}

interface CreatePostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if user is restricted from posting
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("lock_status")
      .eq("id", user.id)
      .single();

    if (profile?.lock_status === "restricted" || profile?.lock_status === "banned") {
      return { success: false, error: "Your account is restricted from posting" };
    }

    const { postType, content, isSensitive, tags, publishMode, scheduledFor } = input;

    // Extract media URLs for moderation
    const mediaUrls = extractMediaUrls(postType, content);
    let moderationStatus: "approved" | "flagged" = "approved";
    let moderationReason: string | null = null;

    // Moderate content if there are media URLs
    if (mediaUrls.length > 0) {
      for (const { url, type } of mediaUrls) {
        const result = await moderateContent(url, type);
        if (result.flagged) {
          moderationStatus = "flagged";
          moderationReason = result.reason || "Content flagged by automated moderation";
          break;
        }
      }
    }

    // Determine status and queue position
    let status: "published" | "queued" | "scheduled" = "published";
    let queuePosition: number | null = null;

    if (publishMode === "queue") {
      status = "queued";
      // Get next queue position
      const { data: nextPos } = await (supabase as any).rpc("get_next_queue_position", {
        p_user_id: user.id,
      });
      queuePosition = nextPos || 1;
    } else if (publishMode === "schedule" && scheduledFor) {
      status = "scheduled";
    }

    // Create the post
    const { data: post, error: postError } = await (supabase as any)
      .from("posts")
      .insert({
        author_id: user.id,
        post_type: postType,
        content: content,
        is_sensitive: isSensitive || false,
        status,
        queue_position: queuePosition,
        scheduled_for: scheduledFor || null,
        published_at: status === "published" ? new Date().toISOString() : null,
        moderation_status: moderationStatus,
        moderation_reason: moderationReason,
        moderated_at: moderationStatus === "flagged" ? new Date().toISOString() : null,
      })
      .select("id")
      .single();

    if (postError) {
      console.error("Create post error:", postError);
      return { success: false, error: "Failed to create post" };
    }

    // If content was flagged, create a report for staff review
    if (moderationStatus === "flagged") {
      await (supabase as any).from("reports").insert({
        reporter_id: null, // System report
        reported_user_id: user.id,
        post_id: post.id,
        subject: "minor_safety",
        comments: moderationReason,
        source: "auto_moderation",
        status: "pending",
      });

      // Notify admins
      const { data: admins } = await (supabase as any)
        .from("profiles")
        .select("id")
        .gte("role", 10);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin: any) => ({
          recipient_id: admin.id,
          actor_id: user.id,
          notification_type: "mention",
          post_id: post.id,
          is_read: false,
        }));
        await (supabase as any).from("notifications").insert(notifications);
      }
    }

    // Handle tags
    if (tags && tags.length > 0) {
      await handleTags(supabase, post.id, tags);
    }

    revalidatePath("/feed");
    return { success: true, postId: post.id };
  } catch (error) {
    console.error("Create post error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Extract media URLs from post content for moderation
 */
function extractMediaUrls(
  postType: PostType,
  content: PostContent
): { url: string; type: "image" | "video" }[] {
  const urls: { url: string; type: "image" | "video" }[] = [];

  if (postType === "image" || postType === "gallery") {
    const imageContent = content as ImagePostContent;
    if (imageContent.urls) {
      for (const url of imageContent.urls) {
        urls.push({ url, type: "image" });
      }
    } else if (imageContent.urls) {
      urls.push({ url: imageContent.urls, type: "image" });
    }
  } else if (postType === "video") {
    const videoContent = content as VideoPostContent;
    if (videoContent.url) {
      urls.push({ url: videoContent.url, type: "video" });
    }
    if (videoContent.thumbnail_url) {
      urls.push({ url: videoContent.thumbnail_url, type: "image" });
    }
  }

  return urls;
}

async function handleTags(supabase: any, postId: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const normalizedTag = tagName.toLowerCase().trim().replace(/^#/, "");
    if (!normalizedTag) continue;

    // Upsert tag
    let { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("name", normalizedTag)
      .single();

    if (!tag) {
      const { data: newTag } = await supabase
        .from("tags")
        .insert({ name: normalizedTag })
        .select("id")
        .single();
      tag = newTag;
    }

    if (tag) {
      // Link tag to post
      await supabase.from("post_tags").insert({
        post_id: postId,
        tag_id: tag.id,
      });
    }
  }
}

interface UpdatePostInput {
  postId: string;
  content?: PostContent;
  isSensitive?: boolean;
  tags?: string[];
}

export async function updatePost(input: UpdatePostInput): Promise<CreatePostResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { postId, content, isSensitive, tags } = input;

    // Verify ownership
    const { data: existingPost } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return { success: false, error: "Post not found or unauthorized" };
    }

    // Update the post
    const updateData: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content;
    if (isSensitive !== undefined) updateData.is_sensitive = isSensitive;

    const { error: updateError } = await (supabase as any)
      .from("posts")
      .update(updateData)
      .eq("id", postId);

    if (updateError) {
      return { success: false, error: "Failed to update post" };
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Remove existing tags
      await (supabase as any).from("post_tags").delete().eq("post_id", postId);
      // Add new tags
      if (tags.length > 0) {
        await handleTags(supabase, postId, tags);
      }
    }

    revalidatePath("/feed");
    revalidatePath(`/post/${postId}`);
    return { success: true, postId };
  } catch (error) {
    console.error("Update post error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deletePost(postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const { data: existingPost } = await (supabase as any)
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return { success: false, error: "Post not found or unauthorized" };
    }

    // Soft delete - set status to deleted
    const { error } = await (supabase as any)
      .from("posts")
      .update({ status: "deleted" })
      .eq("id", postId);

    if (error) {
      return { success: false, error: "Failed to delete post" };
    }

    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Delete post error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Helper to generate a temporary post ID for uploads before creation
export async function generatePostId(): Promise<string> {
  return crypto.randomUUID();
}

// Create text post helper
export async function createTextPost(
  html: string,
  plain: string,
  options?: { isSensitive?: boolean; tags?: string[] }
): Promise<CreatePostResult> {
  const content: TextPostContent = { html, plain };
  return createPost({
    postType: "text",
    content,
    ...options,
  });
}

// Create image post helper
export async function createImagePost(
  urls: string[],
  altTexts: string[],
  captionHtml?: string,
  options?: { isSensitive?: boolean; tags?: string[] }
): Promise<CreatePostResult> {
  const content: ImagePostContent = {
    urls,
    alt_texts: altTexts,
    caption_html: captionHtml,
  };
  return createPost({
    postType: urls.length > 1 ? "gallery" : "image",
    content,
    ...options,
  });
}

// Create video post helper
export async function createVideoPost(
  url: string,
  thumbnailUrl?: string,
  duration?: number,
  captionHtml?: string,
  options?: { isSensitive?: boolean; tags?: string[] }
): Promise<CreatePostResult> {
  const content: VideoPostContent = {
    url,
    thumbnail_url: thumbnailUrl,
    duration,
    caption_html: captionHtml,
  };
  return createPost({
    postType: "video",
    content,
    ...options,
  });
}

// Create audio post helper
export async function createAudioPost(
  url: string,
  spotifyData?: { track_id: string; name: string; artist: string; album: string },
  albumArtUrl?: string,
  captionHtml?: string,
  options?: { isSensitive?: boolean; tags?: string[] }
): Promise<CreatePostResult> {
  const content: AudioPostContent = {
    url,
    album_art_url: albumArtUrl,
    spotify_data: spotifyData,
    caption_html: captionHtml,
  };
  return createPost({
    postType: "audio",
    content,
    ...options,
  });
}

interface PostWithDetails {
  id: string;
  authorId: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  postType: PostType;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags?: Array<{ id: string; name: string }>;
}

/**
 * Get posts by user ID
 */
export async function getPostsByUser(
  userId: string,
  options?: { limit?: number; offset?: number; includePinned?: boolean }
): Promise<{
  success: boolean;
  posts?: PostWithDetails[];
  pinnedPost?: PostWithDetails;
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get posts
    const { data: posts, error, count } = await (supabase as any)
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
        author:author_id (
          username,
          display_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("author_id", userId)
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Get posts error:", error);
      return { success: false, error: "Failed to fetch posts" };
    }

    // Get like counts for posts
    const postIds = (posts || []).map((p: any) => p.id);
    const { data: likeCounts } = await (supabase as any)
      .from("likes")
      .select("post_id")
      .in("post_id", postIds);

    const { data: commentCounts } = await (supabase as any)
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    // Get reblog counts (posts that reblogged from these posts)
    const { data: reblogCounts } = await (supabase as any)
      .from("posts")
      .select("reblogged_from_id")
      .in("reblogged_from_id", postIds)
      .eq("status", "published");

    // Check if current user has liked/commented/reblogged
    let userLikes: string[] = [];
    let userComments: string[] = [];
    let userReblogs: string[] = [];
    if (user) {
      const { data: likes } = await (supabase as any)
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userLikes = (likes || []).map((l: any) => l.post_id);

      const { data: comments } = await (supabase as any)
        .from("comments")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userComments = (comments || []).map((c: any) => c.post_id);

      // Check if user has reblogged any of these posts
      const { data: reblogs } = await (supabase as any)
        .from("posts")
        .select("reblogged_from_id")
        .eq("author_id", user.id)
        .in("reblogged_from_id", postIds)
        .neq("status", "deleted");
      userReblogs = (reblogs || []).map((r: any) => r.reblogged_from_id);
    }

    // Count likes/comments/reblogs per post
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    (likeCounts || []).forEach((l: any) => {
      likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
    });
    (commentCounts || []).forEach((c: any) => {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
    });
    (reblogCounts || []).forEach((r: any) => {
      reblogCountMap.set(r.reblogged_from_id, (reblogCountMap.get(r.reblogged_from_id) || 0) + 1);
    });

    const formattedPosts: PostWithDetails[] = (posts || []).map((post: any) => ({
      id: post.id,
      authorId: post.author_id,
      author: {
        username: post.author?.username || "unknown",
        displayName: post.author?.display_name,
        avatarUrl: post.author?.avatar_url,
      },
      postType: post.post_type,
      content: post.content,
      isSensitive: post.is_sensitive,
      isPinned: post.is_pinned,
      createdAt: formatTimeAgo(post.created_at),
      likeCount: likeCountMap.get(post.id) || 0,
      commentCount: commentCountMap.get(post.id) || 0,
      reblogCount: reblogCountMap.get(post.id) || 0,
      hasLiked: userLikes.includes(post.id),
      hasCommented: userComments.includes(post.id),
      hasReblogged: userReblogs.includes(post.id),
    }));

    // Separate pinned post if requested
    let pinnedPost: PostWithDetails | undefined;
    let regularPosts = formattedPosts;
    if (options?.includePinned) {
      pinnedPost = formattedPosts.find((p) => p.isPinned);
      regularPosts = formattedPosts.filter((p) => !p.isPinned);
    }

    return {
      success: true,
      posts: regularPosts,
      pinnedPost,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get posts liked by a user
 */
export async function getLikedPosts(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  posts?: PostWithDetails[];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get liked posts
    const { data: likes, error, count } = await (supabase as any)
      .from("likes")
      .select(
        `
        post_id,
        created_at,
        post:post_id (
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          created_at,
          author:author_id (
            username,
            display_name,
            avatar_url
          )
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Get liked posts error:", error);
      return { success: false, error: "Failed to fetch liked posts" };
    }

    const filteredLikes = (likes || []).filter((l: any) => l.post);
    const postIds = filteredLikes.map((l: any) => l.post.id);

    // Get like, comment, and reblog counts for these posts
    const { data: likeCounts } = await (supabase as any)
      .from("likes")
      .select("post_id")
      .in("post_id", postIds);

    const { data: commentCounts } = await (supabase as any)
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    const { data: reblogCounts } = await (supabase as any)
      .from("posts")
      .select("reblogged_from_id")
      .in("reblogged_from_id", postIds)
      .eq("status", "published");

    // Check if current user has commented/reblogged these posts
    let userComments: string[] = [];
    let userReblogs: string[] = [];
    if (user) {
      const { data: comments } = await (supabase as any)
        .from("comments")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userComments = (comments || []).map((c: any) => c.post_id);

      const { data: reblogs } = await (supabase as any)
        .from("posts")
        .select("reblogged_from_id")
        .eq("author_id", user.id)
        .in("reblogged_from_id", postIds)
        .neq("status", "deleted");
      userReblogs = (reblogs || []).map((r: any) => r.reblogged_from_id);
    }

    // Count per post
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    (likeCounts || []).forEach((l: any) => {
      likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
    });
    (commentCounts || []).forEach((c: any) => {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
    });
    (reblogCounts || []).forEach((r: any) => {
      reblogCountMap.set(r.reblogged_from_id, (reblogCountMap.get(r.reblogged_from_id) || 0) + 1);
    });

    const posts = filteredLikes.map((l: any) => ({
      id: l.post.id,
      authorId: l.post.author_id,
      author: {
        username: l.post.author?.username || "unknown",
        displayName: l.post.author?.display_name,
        avatarUrl: l.post.author?.avatar_url,
      },
      postType: l.post.post_type,
      content: l.post.content,
      isSensitive: l.post.is_sensitive,
      isPinned: false,
      createdAt: formatTimeAgo(l.post.created_at),
      likeCount: likeCountMap.get(l.post.id) || 0,
      commentCount: commentCountMap.get(l.post.id) || 0,
      reblogCount: reblogCountMap.get(l.post.id) || 0,
      hasLiked: true,
      hasCommented: userComments.includes(l.post.id),
      hasReblogged: userReblogs.includes(l.post.id),
    }));

    return {
      success: true,
      posts,
      total: count || 0,
    };
  } catch (error) {
    console.error("Get liked posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// Helper to format time ago
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get posts that a user has commented on
 */
export async function getCommentedPosts(
  userId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  posts?: PostWithDetails[];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get comments by this user with their associated posts
    const { data: comments, error, count } = await (supabase as any)
      .from("comments")
      .select(
        `
        id,
        post_id,
        created_at,
        post:post_id (
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          created_at,
          status,
          author:author_id (
            username,
            display_name,
            avatar_url
          )
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get commented posts error:", error);
      return { success: false, error: "Failed to fetch commented posts" };
    }

    // Filter out deleted posts and deduplicate by post_id
    const seenPostIds = new Set<string>();
    const uniqueComments = (comments || []).filter((c: any) => {
      if (!c.post || c.post.status === "deleted") return false;
      if (seenPostIds.has(c.post.id)) return false;
      seenPostIds.add(c.post.id);
      return true;
    });

    // Apply pagination after deduplication
    const paginatedComments = uniqueComments.slice(offset, offset + limit);

    // Get like, comment, and reblog counts for these posts
    const postIds = paginatedComments.map((c: any) => c.post.id);

    const { data: likeCounts } = await (supabase as any)
      .from("likes")
      .select("post_id")
      .in("post_id", postIds);

    const { data: commentCounts } = await (supabase as any)
      .from("comments")
      .select("post_id")
      .in("post_id", postIds);

    const { data: reblogCounts } = await (supabase as any)
      .from("posts")
      .select("reblogged_from_id")
      .in("reblogged_from_id", postIds)
      .eq("status", "published");

    // Check if current user has liked/reblogged these posts
    let userLikes: string[] = [];
    let userReblogs: string[] = [];
    if (user) {
      const { data: likes } = await (supabase as any)
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in("post_id", postIds);
      userLikes = (likes || []).map((l: any) => l.post_id);

      const { data: reblogs } = await (supabase as any)
        .from("posts")
        .select("reblogged_from_id")
        .eq("author_id", user.id)
        .in("reblogged_from_id", postIds)
        .neq("status", "deleted");
      userReblogs = (reblogs || []).map((r: any) => r.reblogged_from_id);
    }

    // Count likes/comments/reblogs per post
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    (likeCounts || []).forEach((l: any) => {
      likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
    });
    (commentCounts || []).forEach((c: any) => {
      commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
    });
    (reblogCounts || []).forEach((r: any) => {
      reblogCountMap.set(r.reblogged_from_id, (reblogCountMap.get(r.reblogged_from_id) || 0) + 1);
    });

    const posts: PostWithDetails[] = paginatedComments.map((c: any) => ({
      id: c.post.id,
      authorId: c.post.author_id,
      author: {
        username: c.post.author?.username || "unknown",
        displayName: c.post.author?.display_name,
        avatarUrl: c.post.author?.avatar_url,
      },
      postType: c.post.post_type,
      content: c.post.content,
      isSensitive: c.post.is_sensitive,
      isPinned: false,
      createdAt: formatTimeAgo(c.post.created_at),
      likeCount: likeCountMap.get(c.post.id) || 0,
      commentCount: commentCountMap.get(c.post.id) || 0,
      reblogCount: reblogCountMap.get(c.post.id) || 0,
      hasLiked: userLikes.includes(c.post.id),
      hasCommented: true, // User definitely commented on these posts
      hasReblogged: userReblogs.includes(c.post.id),
    }));

    return {
      success: true,
      posts,
      total: uniqueComments.length,
    };
  } catch (error) {
    console.error("Get commented posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get feed posts (from followed users or all public posts)
 */
export async function getFeedPosts(options?: {
  limit?: number;
  offset?: number;
  sortBy?: "chronological" | "engagement";
}): Promise<{
  success: boolean;
  posts?: PostWithDetails[];
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    // Get user first
    const { data: { user } } = await supabase.auth.getUser();

    // Get followed IDs (only if logged in)
    let followedIds: string[] = [];
    if (user) {
      const { data: follows } = await (supabase as any)
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      followedIds = [...(follows || []).map((f: any) => f.following_id), user.id];
    }

    // Build and execute the main posts query
    let query = (supabase as any)
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
        author:author_id (
          username,
          display_name,
          avatar_url
        )
      `
      )
      .eq("status", "published");

    // Filter by followed users if logged in and following someone
    if (user && followedIds.length > 0) {
      query = query.in("author_id", followedIds);
    }

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + limit);

    const { data: posts, error } = await query;

    if (error) {
      console.error("Get feed posts error:", error);
      return { success: false, error: "Failed to fetch posts" };
    }

    // Early return if no posts - don't do any more queries
    if (!posts || posts.length === 0) {
      return { success: true, posts: [], hasMore: false };
    }

    const postIds = posts.map((p: any) => p.id);

    // Run all count queries in parallel
    const [likeCounts, commentCounts, reblogCounts, userLikesData, userCommentsData, userReblogsData, postTagsData] = await Promise.all([
      (supabase as any).from("likes").select("post_id").in("post_id", postIds),
      (supabase as any).from("comments").select("post_id").in("post_id", postIds),
      (supabase as any).from("posts").select("reblogged_from_id").in("reblogged_from_id", postIds).eq("status", "published"),
      user ? (supabase as any).from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      user ? (supabase as any).from("comments").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      user ? (supabase as any).from("posts").select("reblogged_from_id").eq("author_id", user.id).in("reblogged_from_id", postIds).neq("status", "deleted") : Promise.resolve({ data: [] }),
      (supabase as any).from("post_tags").select("post_id, tag:tag_id (id, name)").in("post_id", postIds),
    ]);

    const userLikes = (userLikesData.data || []).map((l: any) => l.post_id);
    const userComments = (userCommentsData.data || []).map((c: any) => c.post_id);
    const userReblogs = (userReblogsData.data || []).map((r: any) => r.reblogged_from_id);

    // Count likes/comments/reblogs per post
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
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

    const formattedPosts: PostWithDetails[] = posts.map((post: any) => ({
      id: post.id,
      authorId: post.author_id,
      author: {
        username: post.author?.username || "unknown",
        displayName: post.author?.display_name,
        avatarUrl: post.author?.avatar_url,
      },
      postType: post.post_type,
      content: post.content,
      isSensitive: post.is_sensitive,
      isPinned: post.is_pinned,
      createdAt: formatTimeAgo(post.created_at),
      likeCount: likeCountMap.get(post.id) || 0,
      commentCount: commentCountMap.get(post.id) || 0,
      reblogCount: reblogCountMap.get(post.id) || 0,
      hasLiked: userLikes.includes(post.id),
      hasCommented: userComments.includes(post.id),
      hasReblogged: userReblogs.includes(post.id),
      tags: tagsMap.get(post.id) || [],
    }));

    return {
      success: true,
      posts: formattedPosts,
      hasMore: posts.length === limit,
    };
  } catch (error) {
    console.error("Get feed posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
