"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderateContent } from "@/lib/sightengine/client";
import { isPubliclyViewable } from "@/lib/postVisibility";
import { trackEvent } from "@/lib/analytics/op";
import type {
  PostType,
  PostContent,
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  Json,
  ReportSubject,
  TablesInsert,
} from "@/types/database";
import { processMentions } from "@/actions/mentions";
import { batchFetchPostStats } from "@/actions/shared/post-stats";

interface CreatePostInput {
  postType: PostType;
  content: PostContent;
  isSensitive?: boolean;
  /** Author opted this post out of the public (logged-out) front page / web. */
  excludeFromPublic?: boolean;
  tags?: string[];
  publishMode?: "now" | "queue" | "schedule";
  scheduledFor?: string;
  threadId?: string;
  startThread?: boolean;
  pendingCommunityIds?: string[];
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("lock_status")
      .eq("id", user.id)
      .single();

    if (profile?.lock_status === "restricted" || profile?.lock_status === "banned") {
      return { success: false, error: "Your account is restricted from posting" };
    }

    const { postType, content, isSensitive, excludeFromPublic, tags, publishMode, scheduledFor, threadId, startThread, pendingCommunityIds } = input;

    // Extract media URLs for moderation
    const mediaUrls = extractMediaUrls(postType, content);
    let moderationStatus: "approved" | "flagged" | "pending" = "approved";
    let moderationReason: string | null = null;
    let autoSensitive = false; // Auto-tag as sensitive if nudity/gore detected
    let heldForReview = false; // Withhold from publishing until a human reviews
    let reportSubject = "minor_safety"; // reports.subject for the review row

    // Moderate content if there are media URLs
    if (mediaUrls.length > 0) {
      for (const { url, type } of mediaUrls) {
        const result = await moderateContent(url, type);

        // Hard block: possible minor + sexual content, or extreme gore.
        if (result.flagged) {
          moderationStatus = "flagged";
          moderationReason = result.reason || "Content flagged by automated moderation";
          reportSubject = result.sensitiveReason === "minor_safety" ? "minor_safety" : "other";
          autoSensitive = true;
          heldForReview = true;
          break;
        }

        // Hold for manual review: possible minor with no nudity.
        if (result.hold) {
          moderationStatus = "pending";
          moderationReason = result.holdReason || result.reason || "Held for manual review";
          reportSubject = "minor_safety";
          heldForReview = true;
          break;
        }

        // Moderation was configured but failed — fail closed and hold, rather
        // than publish unscreened content.
        if (result.errored) {
          moderationStatus = "pending";
          moderationReason = "Automated moderation was unavailable; held for manual review";
          reportSubject = "other";
          heldForReview = true;
          break;
        }

        // Auto-tag as sensitive (nudity, erotica, moderate gore).
        if (result.suggestSensitive) {
          autoSensitive = true;
        }
      }
    }

    // Determine status and queue position
    // IMPORTANT: held content goes to "draft" for review (not published)
    let status: "draft" | "published" | "queued" | "scheduled" = "published";
    let queuePosition: number | null = null;

    // Held content (block or manual-review) must NOT publish
    if (heldForReview) {
      status = "draft"; // Hold for staff review
    } else if (publishMode === "queue") {
      status = "queued";
      // Get next queue position
      const { data: nextPos } = await supabase.rpc("get_next_queue_position", {
        p_user_id: user.id,
      });
      queuePosition = nextPos || 1;
    } else if (publishMode === "schedule" && scheduledFor) {
      status = "scheduled";
    }

    // Create the post
    // Auto-tag as sensitive if moderation detected nudity/gore (even if user didn't mark it)
    const finalIsSensitive = isSensitive || autoSensitive;

    // Hard rule: sensitive/NSFW content is NEVER shown to logged-out visitors,
    // regardless of the author's choice. Otherwise honour the per-post opt-out.
    const finalExcludeFromPublic = finalIsSensitive ? true : excludeFromPublic ?? false;

    // Determine thread_position if appending to an existing thread
    let threadPosition: number | null = null;
    if (threadId) {
      const { data: maxPosRow } = await supabase
        .from("posts")
        .select("thread_position")
        .eq("thread_id", threadId)
        .order("thread_position", { ascending: false })
        .limit(1)
        .single();
      threadPosition = (maxPosRow?.thread_position || 0) + 1;
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        post_type: postType,
        content: content as unknown as Json,
        is_sensitive: finalIsSensitive,
        exclude_from_public: finalExcludeFromPublic,
        status,
        queue_position: queuePosition,
        // Stamp when the post entered the queue so the publisher paces off this
        // (not created_at) — see 20260801_posts_queued_at.sql.
        queued_at: status === "queued" ? new Date().toISOString() : null,
        scheduled_for: scheduledFor || null,
        pending_community_ids: pendingCommunityIds && pendingCommunityIds.length > 0 ? pendingCommunityIds : null,
        // Only set published_at if actually publishing (not flagged)
        published_at: status === "published" ? new Date().toISOString() : null,
        moderation_status: moderationStatus,
        moderation_reason: moderationReason,
        moderated_at: heldForReview ? new Date().toISOString() : null,
        thread_id: threadId || null,
        thread_position: threadPosition,
      })
      .select("id")
      .single();

    if (postError) {
      console.error("Create post error:", postError);
      return { success: false, error: "Failed to create post" };
    }

    // If starting a new thread, set thread_id to the post's own id and thread_position to 1
    if (startThread && !threadId) {
      await supabase
        .from("posts")
        .update({ thread_id: post.id, thread_position: 1 })
        .eq("id", post.id);
    }

    // If content was held (blocked or flagged for manual review), create a
    // report for staff and hold the post out of public view.
    if (heldForReview) {
      await supabase.from("reports").insert({
        reporter_id: null, // System report
        reported_user_id: user.id,
        post_id: post.id,
        subject: reportSubject as ReportSubject,
        comments: moderationReason,
        source: "auto_moderation",
        status: "pending",
      });

      // Notify admins about flagged content
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .gte("role", 10);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin): TablesInsert<"notifications"> => ({
          recipient_id: admin.id,
          actor_id: user.id,
          notification_type: "moderation",
          post_id: post.id,
          is_read: false,
        }));
        await supabase.from("notifications").insert(notifications);
      }

      // Return success but inform user their post is under review
      return {
        success: true,
        postId: post.id,
        error: "Your post is being reviewed by our moderation team and will be published once approved.",
      };
    }

    // Handle tags
    if (tags && tags.length > 0) {
      await handleTags(supabase, post.id, tags);
    }

    // Process mentions (only for published posts)
    if (status === "published") {
      const textContent = extractTextContent(postType, content);
      if (textContent) {
        await processMentions(textContent, user.id, post.id, "post");
      }
      // Product event — only for posts that actually went live now (queued /
      // scheduled posts publish later via cron and aren't counted here).
      void trackEvent("post_published", user.id, { postType });
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
    } else if ((imageContent as any).url) {
      urls.push({ url: (imageContent as any).url, type: "image" });
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

function extractTextContent(postType: PostType, content: PostContent): string | null {
  if (postType === "text") {
    const textContent = content as TextPostContent;
    return textContent.html || textContent.plain || null;
  }

  // For other post types, check for caption
  if ("caption_html" in content && content.caption_html) {
    return content.caption_html as string;
  }

  return null;
}

/**
 * Handle tags for a post
 * Optimized: Uses batch queries instead of N+1 (2-3 queries total instead of 2-3 per tag)
 */
async function handleTags(supabase: any, postId: string, tagNames: string[]) {
  // Normalize tag names (preserve original casing for display)
  const normalizedTags = tagNames
    .map(name => name.trim().replace(/^#/, "").replace(/\s+/g, " "))
    .filter(name => name.length > 0);

  if (normalizedTags.length === 0) return;

  // Batch fetch: Get all existing tags case-insensitively
  const orFilter = normalizedTags.map(name => `name.ilike.${name}`).join(",");
  const { data: existingTags } = await supabase
    .from("tags")
    .select("id, name")
    .or(orFilter);

  // Map lowercase name → tag id for case-insensitive comparison
  const existingTagMap = new Map<string, string>();
  for (const tag of existingTags || []) {
    existingTagMap.set(tag.name.toLowerCase(), tag.id);
  }

  // Find tags that don't exist yet (case-insensitive check)
  const newTagNames = normalizedTags.filter(name => !existingTagMap.has(name.toLowerCase()));

  // Batch insert: Create all new tags in one query (preserves user's casing)
  if (newTagNames.length > 0) {
    const { data: createdTags } = await supabase
      .from("tags")
      .insert(newTagNames.map(name => ({ name })))
      .select("id, name");

    // Add newly created tags to the map
    for (const tag of createdTags || []) {
      existingTagMap.set(tag.name.toLowerCase(), tag.id);
    }
  }

  // Batch insert: Link all tags to post in one query
  const postTagInserts = normalizedTags
    .map(name => existingTagMap.get(name.toLowerCase()))
    .filter((tagId): tagId is string => tagId !== undefined)
    .map(tagId => ({ post_id: postId, tag_id: tagId }));

  if (postTagInserts.length > 0) {
    await supabase.from("post_tags").insert(postTagInserts);
  }
}

interface UpdatePostInput {
  postId: string;
  content?: PostContent;
  reblogComment?: string | null;
  isSensitive?: boolean;
  /** Author opted this post out of the public (logged-out) front page / web. */
  excludeFromPublic?: boolean;
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

    const { postId, content, reblogComment, isSensitive, excludeFromPublic, tags } = input;

    // Verify ownership (and fetch the fields needed to re-derive visibility).
    const { data: existingPost } = await supabase
      .from("posts")
      .select("author_id, post_type, is_sensitive, exclude_from_public")
      .eq("id", postId)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return { success: false, error: "Post not found or unauthorized" };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (content !== undefined) updateData.content = content;
    if (reblogComment !== undefined) updateData.reblog_comment_html = reblogComment;

    // Re-moderate on content change so an edit can't slip NSFW past the
    // create-time screen (mirrors createPost). Without this, an author could
    // publish a clean image and then swap in an unmoderated one.
    let autoSensitive = false;
    let heldForReview = false;
    if (content !== undefined) {
      const mediaUrls = extractMediaUrls(existingPost.post_type, content);
      for (const { url, type } of mediaUrls) {
        const result = await moderateContent(url, type);
        if (result.flagged) {
          updateData.moderation_status = "flagged";
          updateData.moderation_reason = result.reason || "Content flagged by automated moderation";
          autoSensitive = true;
          heldForReview = true;
          break;
        }
        if (result.hold) {
          updateData.moderation_status = "pending";
          updateData.moderation_reason = result.holdReason || result.reason || "Held for manual review";
          heldForReview = true;
          break;
        }
        if (result.errored) {
          updateData.moderation_status = "pending";
          updateData.moderation_reason = "Automated moderation was unavailable; held for manual review";
          heldForReview = true;
          break;
        }
        if (result.suggestSensitive) autoSensitive = true;
      }
      if (heldForReview) {
        updateData.moderated_at = new Date().toISOString();
        // Pull the edited post off the public web until a human reviews it.
        updateData.status = "draft";
      }
    }

    // Sensitivity is the greater of what the author asked for and what the screen
    // found — an author cannot un-flag content moderation considers sensitive.
    const requestedSensitive = isSensitive !== undefined ? isSensitive : !!existingPost.is_sensitive;
    const finalIsSensitive = requestedSensitive || autoSensitive;
    const requestedExclude = excludeFromPublic !== undefined ? excludeFromPublic : !!existingPost.exclude_from_public;
    updateData.is_sensitive = finalIsSensitive;
    // Hard rule: sensitive is NEVER public, whatever the visibility toggle says.
    updateData.exclude_from_public = finalIsSensitive ? true : requestedExclude;

    const { error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", postId);

    if (updateError) {
      return { success: false, error: "Failed to update post" };
    }

    // Update tags if provided
    if (tags !== undefined) {
      // Remove existing tags
      await supabase.from("post_tags").delete().eq("post_id", postId);
      // Add new tags
      if (tags.length > 0) {
        await handleTags(supabase, postId, tags);
      }
    }

    // Revalidation removed — local state updates handle UI, prevents SSR crash
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
    const { data: existingPost } = await supabase
      .from("posts")
      .select("author_id")
      .eq("id", postId)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return { success: false, error: "Post not found or unauthorized" };
    }

    // Soft delete - set status to deleted
    const { error } = await supabase
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
    role: number;
  };
  postType: PostType;
  content: any;
  isSensitive: boolean;
  excludeFromPublic?: boolean;
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  voiceReactionCount?: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  hasBookmarked?: boolean;
  isFollowingAuthor?: boolean;
  tags?: Array<{ id: string; name: string }>;
  // Reblog metadata
  isReblog?: boolean;
  reblogCommentHtml?: string | null;
  originalAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  rebloggedFromAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  // Thread metadata
  threadId?: string | null;
  threadPosition?: number | null;
  threadLength?: number;
}


/**
 * Get a single post by ID
 */
export async function getPostById(postId: string): Promise<{
  success: boolean;
  post?: PostWithDetails;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get the post
    const { data: post, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        is_pinned,
        status,
        moderation_status,
        created_at,
        author:profiles!posts_author_id_fkey (
          username,
          display_name,
          avatar_url,
          role,
          is_discoverable,
          lock_status
        )
      `
      )
      .eq("id", postId)
      .single();

    if (error || !post) {
      console.error("Get post error:", error);
      return { success: false, error: "Post not found" };
    }

    // Owners always see their own posts (incl. draft/scheduled/queued to edit).
    // Everyone else: never unpublished, never moderator-withheld (removed/held) —
    // and anonymous callers (e.g. a harvested Server Action id) only ever get a
    // fully-public post, since members-only / sensitive posts rely on the page's
    // login + age gate that a direct action call would bypass.
    if (post.author_id !== user?.id) {
      if (post.status !== "published" || post.moderation_status !== "approved") {
        return { success: false, error: "Post not found" };
      }
      if (!user && !isPubliclyViewable(post, post.author)) {
        return { success: false, error: "Post not found" };
      }
    }

    // Batch fetch all stats and interactions
    const stats = await batchFetchPostStats(supabase, [postId], user?.id, { includeTags: true });

    const postWithDetails: PostWithDetails = {
      id: post.id,
      authorId: post.author_id,
      author: {
        username: post.author.username,
        displayName: post.author.display_name,
        avatarUrl: post.author.avatar_url,
        role: post.author.role || 0,
      },
      postType: post.post_type,
      content: post.content,
      isSensitive: post.is_sensitive ?? false,
      excludeFromPublic: post.exclude_from_public ?? false,
      isPinned: post.is_pinned ?? false,
      isOwn: user?.id === post.author_id,
      createdAt: post.created_at ?? "",
      likeCount: stats.likeCountMap.get(postId) || 0,
      commentCount: stats.commentCountMap.get(postId) || 0,
      reblogCount: stats.reblogCountMap.get(postId) || 0,
      voiceReactionCount: stats.voiceCountMap.get(postId) || 0,
      hasLiked: stats.userLikeSet.has(postId),
      hasCommented: stats.userCommentSet.has(postId),
      hasReblogged: stats.userReblogSet.has(postId),
      tags: stats.tagsMap.get(postId) || [],
    };

    return { success: true, post: postWithDetails };
  } catch (error) {
    console.error("Get post by ID error:", error);
    return { success: false, error: "Failed to fetch post" };
  }
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
    const { data: posts, error, count } = await supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        is_pinned,
        created_at,
        author:author_id (
          username,
          display_name,
          avatar_url,
          role
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

    // Get counts and user interactions in parallel
    const postIds = (posts || []).map((p: any) => p.id);

    if (postIds.length === 0) {
      return { success: true, posts: [], total: 0 };
    }

    // Batch fetch all stats and interactions
    const stats = await batchFetchPostStats(supabase, postIds, user?.id);

    const formattedPosts: PostWithDetails[] = (posts || []).map((post: any) => ({
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
      excludeFromPublic: post.exclude_from_public ?? false,
      isPinned: post.is_pinned,
      isOwn: user ? post.author_id === user.id : false,
      createdAt: formatTimeAgo(post.created_at),
      likeCount: stats.likeCountMap.get(post.id) || 0,
      commentCount: stats.commentCountMap.get(post.id) || 0,
      reblogCount: stats.reblogCountMap.get(post.id) || 0,
      hasLiked: stats.userLikeSet.has(post.id),
      hasCommented: stats.userCommentSet.has(post.id),
      hasReblogged: stats.userReblogSet.has(post.id),
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
    const { data: likes, error, count } = await supabase
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
          exclude_from_public,
        exclude_from_public,
          created_at,
          author:author_id (
            username,
            display_name,
            avatar_url,
            role
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

    // Batch fetch all stats and interactions in parallel
    const stats = await batchFetchPostStats(supabase, postIds, user?.id);

    const posts = filteredLikes.map((l: any) => ({
      id: l.post.id,
      authorId: l.post.author_id,
      author: {
        username: l.post.author?.username || "unknown",
        displayName: l.post.author?.display_name,
        avatarUrl: l.post.author?.avatar_url,
        role: l.post.author?.role || 0,
      },
      postType: l.post.post_type,
      content: l.post.content,
      isSensitive: l.post.is_sensitive,
      excludeFromPublic: l.post.exclude_from_public ?? false,
      isPinned: false,
      isOwn: false,
      createdAt: formatTimeAgo(l.post.created_at),
      likeCount: stats.likeCountMap.get(l.post.id) || 0,
      commentCount: stats.commentCountMap.get(l.post.id) || 0,
      reblogCount: stats.reblogCountMap.get(l.post.id) || 0,
      hasLiked: true,
      hasCommented: stats.userCommentSet.has(l.post.id),
      hasReblogged: stats.userReblogSet.has(l.post.id),
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
    const { data: comments, error, count } = await supabase
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
          exclude_from_public,
        exclude_from_public,
          created_at,
          status,
          author:author_id (
            username,
            display_name,
            avatar_url,
            role
          )
        )
      `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit((offset + limit) * 2); // Fetch 2x to handle deduplication after filtering deleted

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

    // Batch fetch all stats and interactions in parallel
    const postIds = paginatedComments.map((c: any) => c.post.id);
    const stats = await batchFetchPostStats(supabase, postIds, user?.id);

    const posts: PostWithDetails[] = paginatedComments.map((c: any) => ({
      id: c.post.id,
      authorId: c.post.author_id,
      author: {
        username: c.post.author?.username || "unknown",
        displayName: c.post.author?.display_name,
        avatarUrl: c.post.author?.avatar_url,
        role: c.post.author?.role || 0,
      },
      postType: c.post.post_type,
      content: c.post.content,
      isSensitive: c.post.is_sensitive,
      excludeFromPublic: c.post.exclude_from_public ?? false,
      isPinned: false,
      isOwn: false,
      createdAt: formatTimeAgo(c.post.created_at),
      likeCount: stats.likeCountMap.get(c.post.id) || 0,
      commentCount: stats.commentCountMap.get(c.post.id) || 0,
      reblogCount: stats.reblogCountMap.get(c.post.id) || 0,
      hasLiked: stats.userLikeSet.has(c.post.id),
      hasCommented: true, // User definitely commented on these posts
      hasReblogged: stats.userReblogSet.has(c.post.id),
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
 * Public front page post shape — matches the FeedList `FeedPost` interface so the
 * Front Page tiles can render it directly (read-only, no auth required).
 */
export interface PublicFrontPagePost {
  id: string;
  author: { username: string; avatarUrl: string; role?: number };
  authorId: string;
  timestamp: string;
  contentType: "text" | "image" | "video" | "audio" | "gallery" | "poll" | "ask";
  content: {
    text?: string;
    html?: string;
    imageUrl?: string;
    imageUrls?: string[];
    videoUrl?: string;
    videoThumbnailUrl?: string;
    embedUrl?: string;
    embedPlatform?: string;
    audioUrl?: string;
    albumArtUrl?: string;
    spotifyData?: any;
    captionHtml?: string;
    transcript?: string;
    isVoiceNote?: boolean;
    isEssay?: boolean;
    essayTitle?: string;
    readingTimeMinutes?: number;
  };
  rawContent: any;
  stats: { comments: number; likes: number; reblogs: number };
  interactions: { hasCommented: boolean; hasLiked: boolean; hasReblogged: boolean };
  isSensitive: boolean;
  isOwn: boolean;
  tags: Array<{ id: string; name: string }>;
  threadId: string | null;
}

/** Map a raw posts row into the FeedPost-shaped content object. */
function shapePublicContent(postType: string, postContent: any): PublicFrontPagePost["content"] {
  const c: PublicFrontPagePost["content"] = {};
  if (postType === "text") {
    c.text = postContent?.plain || postContent?.html?.replace(/<[^>]*>/g, "") || "";
    c.html = postContent?.html;
    c.isEssay = !!postContent?.is_essay;
    c.essayTitle = postContent?.essay_title;
    c.readingTimeMinutes = postContent?.reading_time_minutes;
  } else if (postType === "image") {
    c.imageUrl = postContent?.urls?.[0] || postContent?.url;
    c.captionHtml = postContent?.caption_html;
  } else if (postType === "gallery") {
    c.imageUrls = postContent?.urls;
    c.imageUrl = postContent?.urls?.[0];
    c.captionHtml = postContent?.caption_html;
  } else if (postType === "video") {
    c.videoUrl = postContent?.url;
    c.videoThumbnailUrl = postContent?.thumbnail_url;
    c.embedUrl = postContent?.embed_url;
    c.embedPlatform = postContent?.embed_platform;
    c.captionHtml = postContent?.caption_html;
  } else if (postType === "audio") {
    c.audioUrl = postContent?.url;
    c.albumArtUrl = postContent?.album_art_url;
    c.captionHtml = postContent?.caption_html;
    c.spotifyData = postContent?.spotify_data;
    c.transcript = postContent?.transcript;
    c.isVoiceNote = !!postContent?.is_voice_note;
  }
  return c;
}

/**
 * Get posts for the public, unauthenticated front page (the landing page).
 *
 * Returns published, approved, non-sensitive posts that the author has not
 * excluded from public view, authored by discoverable + non-restricted users.
 * Uses the admin/service client (like the /u public pages) so it works without
 * an authenticated session. The result is FeedPost-shaped for the Front Page tiles.
 */
export async function getPublicFrontPagePosts(
  options?: { limit?: number }
): Promise<PublicFrontPagePost[]> {
  try {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 24;

    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        created_at,
        thread_id,
        author:author_id (
          username,
          avatar_url,
          role,
          is_discoverable,
          lock_status
        )
      `
      )
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .eq("is_sensitive", false)
      .eq("exclude_from_public", false)
      .order("created_at", { ascending: false })
      .limit(limit * 3); // over-fetch to allow author-side filtering

    if (error || !posts) {
      if (error) console.error("Get public front page posts error:", error);
      return [];
    }

    const visible = (posts as any[]).filter((p) => {
      const a = p.author;
      if (!a) return false;
      if (a.is_discoverable === false) return false;
      if (a.lock_status === "restricted" || a.lock_status === "banned") return false;
      return true;
    });

    const limited = visible.slice(0, limit);
    return shapePublicPostRows(supabase, limited);
  } catch (error) {
    console.error("Get public front page posts error:", error);
    return [];
  }
}

/** Author-side visibility filter shared by every public (anon) posts query.
 *  The post-level filters (published/approved/is_sensitive/exclude_from_public)
 *  are applied in the DB query; this catches the author-level conditions. */
function filterPublicVisible(rows: any[]): any[] {
  return rows.filter((p) => {
    const a = p.author;
    if (!a) return false;
    if (a.is_discoverable === false) return false;
    if (a.lock_status === "restricted" || a.lock_status === "banned") return false;
    return true;
  });
}

/** Fetch each post's tags and shape rows into the FeedPost-compatible public
 *  shape. Shared by getPublicFrontPagePosts and the tag-filtered queries so
 *  they stay in sync. */
async function shapePublicPostRows(
  supabase: any,
  rows: any[]
): Promise<PublicFrontPagePost[]> {
  const postIds = rows.map((p) => p.id);

  let tagsByPost: Record<string, Array<{ id: string; name: string }>> = {};
  if (postIds.length > 0) {
    const { data: postTagRows } = await supabase
      .from("post_tags")
      .select("post_id, tag:tags!tag_id(id, name)")
      .in("post_id", postIds);

    tagsByPost = (postTagRows ?? []).reduce(
      (acc: Record<string, Array<{ id: string; name: string }>>, row: any) => {
        if (!row.tag) return acc;
        if (!acc[row.post_id]) acc[row.post_id] = [];
        acc[row.post_id].push({ id: row.tag.id, name: row.tag.name });
        return acc;
      },
      {}
    );
  }

  return rows.map((post): PublicFrontPagePost => ({
    id: post.id,
    author: {
      username: post.author?.username || "unknown",
      avatarUrl: post.author?.avatar_url || "",
      role: post.author?.role || 0,
    },
    authorId: post.author_id,
    timestamp: post.created_at,
    contentType: post.post_type,
    content: shapePublicContent(post.post_type, post.content),
    rawContent: post.content,
    stats: { comments: 0, likes: 0, reblogs: 0 },
    interactions: { hasCommented: false, hasLiked: false, hasReblogged: false },
    isSensitive: post.is_sensitive,
    isOwn: false,
    tags: tagsByPost[post.id] ?? [],
    threadId: post.thread_id ?? null,
  }));
}

/**
 * Public posts carrying a given tag — same safety guarantees as the front page
 * (published, approved, NOT sensitive, not excluded-from-public, discoverable +
 * unrestricted author). Admin client, so it works with no session.
 */
export async function getPublicPostsByTag(
  tagName: string,
  options?: { limit?: number }
): Promise<PublicFrontPagePost[]> {
  try {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 6;

    // Resolve the tag name (case-insensitive) to its id.
    const { data: tag } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", tagName)
      .maybeSingle();
    if (!tag) return [];

    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        created_at,
        thread_id,
        author:author_id (
          username,
          avatar_url,
          role,
          is_discoverable,
          lock_status
        ),
        post_tags!inner ( tag_id )
      `
      )
      .eq("post_tags.tag_id", tag.id)
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .eq("is_sensitive", false)
      .eq("exclude_from_public", false)
      .order("created_at", { ascending: false })
      .limit(limit * 3); // over-fetch to allow author-side filtering

    if (error || !posts) {
      if (error) console.error("getPublicPostsByTag error:", error);
      return [];
    }

    const limited = filterPublicVisible(posts as any[]).slice(0, limit);
    return shapePublicPostRows(supabase, limited);
  } catch (error) {
    console.error("getPublicPostsByTag error:", error);
    return [];
  }
}

/** Normalise a search term: drop the @/# people/tag sigils users type, and
 *  strip characters that break PostgREST filter strings / ILIKE wildcards.
 *  So "@ada" searches for "ada" and "#carpenter" for "carpenter". */
function sanitizeIlikeTerm(raw: string): string {
  return raw.replace(/[%_,()*:@#]/g, "").trim();
}

export interface PublicTagResult {
  name: string;
  postCount: number;
}

export interface PublicUserResult {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

/**
 * Public full-text search over posts. Ranking + the public visibility gate
 * (published/approved/NOT sensitive/not excluded + discoverable, unrestricted
 * author) are applied in the `search_public_posts` SQL function so pagination
 * is stable; here we hydrate the ranked ids into the FeedPost public shape and
 * preserve rank order. Admin client — works with no session.
 */
export async function searchPublicPosts(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<PublicFrontPagePost[]> {
  // Normalised so the RPC's tag ILIKE is wildcard-safe and "#car"/"@ada" work;
  // websearch_to_tsquery tokenises whatever's left for the content match.
  const q = sanitizeIlikeTerm(query);
  if (q.length < 2) return [];
  try {
    const supabase = createAdminClient();
    const limit = Math.min(Math.max(options?.limit ?? 24, 1), 50);
    const offset = Math.max(options?.offset ?? 0, 0);

    const { data: ranked, error: rankErr } = await supabase.rpc(
      "search_public_posts",
      { q, lim: limit, off: offset }
    );
    if (rankErr || !ranked || ranked.length === 0) {
      if (rankErr) console.error("searchPublicPosts rpc error:", rankErr);
      return [];
    }

    const rankById = new Map<string, number>(
      (ranked as Array<{ id: string; rank: number }>).map((r) => [r.id, r.rank])
    );
    const ids = (ranked as Array<{ id: string }>).map((r) => r.id);

    const { data: posts, error } = await supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        created_at,
        thread_id,
        author:author_id (
          username,
          avatar_url,
          role,
          is_discoverable,
          lock_status
        )
      `
      )
      .in("id", ids);

    if (error || !posts) {
      if (error) console.error("searchPublicPosts hydrate error:", error);
      return [];
    }

    // Re-apply the author gate (belt & suspenders) and restore rank order —
    // the `.in()` hydrate doesn't preserve the ranked ordering.
    const visible = filterPublicVisible(posts as any[]).sort(
      (a, b) => (rankById.get(b.id) ?? 0) - (rankById.get(a.id) ?? 0)
    );
    return shapePublicPostRows(supabase, visible);
  } catch (error) {
    console.error("searchPublicPosts error:", error);
    return [];
  }
}

/** Public tag search — substring match on tag names, ranked by how many
 *  PUBLICLY-VISIBLE posts carry the tag (via the search_public_tags RPC). Tags
 *  whose only posts are sensitive / members-only never surface, and the count
 *  shown matches what the tag page actually renders. */
export async function searchPublicTags(
  query: string,
  options?: { limit?: number }
): Promise<PublicTagResult[]> {
  const q = sanitizeIlikeTerm(query);
  if (q.length < 1) return [];
  try {
    const supabase = createAdminClient();
    const limit = Math.min(Math.max(options?.limit ?? 12, 1), 50);
    const { data, error } = await supabase.rpc("search_public_tags", {
      q,
      lim: limit,
    });
    if (error || !data) {
      if (error) console.error("searchPublicTags rpc error:", error);
      return [];
    }
    return (data as Array<{ name: string; public_post_count: number }>).map((t) => ({
      name: t.name,
      postCount: Number(t.public_post_count) || 0,
    }));
  } catch (error) {
    console.error("searchPublicTags error:", error);
    return [];
  }
}

/** Public people search — discoverable, unrestricted profiles only. */
export async function searchPublicUsers(
  query: string,
  options?: { limit?: number }
): Promise<PublicUserResult[]> {
  const q = sanitizeIlikeTerm(query);
  if (q.length < 2) return [];
  try {
    const supabase = createAdminClient();
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);
    const { data, error } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url, bio, is_discoverable, lock_status")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(limit * 2); // over-fetch for the author-side gate below
    if (error || !data) {
      if (error) console.error("searchPublicUsers error:", error);
      return [];
    }
    return (data as any[])
      .filter(
        (u) =>
          u.is_discoverable !== false &&
          u.lock_status !== "restricted" &&
          u.lock_status !== "banned"
      )
      .slice(0, limit)
      .map((u) => ({
        username: u.username,
        displayName: u.display_name ?? null,
        avatarUrl: u.avatar_url ?? null,
        bio: u.bio ?? null,
      }));
  } catch (error) {
    console.error("searchPublicUsers error:", error);
    return [];
  }
}

/**
 * Tag "shelves" for the public Discover page: the most-used tags, each with a
 * handful of real public sample posts. Tags whose posts are all non-public
 * (sensitive/excluded/etc.) drop out, so shelves only show what a logged-out
 * visitor may actually see.
 */
export async function getPublicTagShelves(options?: {
  tagLimit?: number;
  postsPerTag?: number;
}): Promise<Array<{ tag: { name: string; postCount: number }; posts: PublicFrontPagePost[] }>> {
  try {
    const supabase = createAdminClient();
    const tagLimit = options?.tagLimit ?? 6;
    const postsPerTag = options?.postsPerTag ?? 6;

    // Over-fetch tags — some will have no publicly-visible posts.
    const { data: tags } = await supabase
      .from("tags")
      .select("name, post_count")
      .gt("post_count", 0)
      .order("post_count", { ascending: false })
      .limit(tagLimit + 6);
    if (!tags) return [];

    const shelves = await Promise.all(
      (tags as any[]).map(async (t) => ({
        tag: { name: t.name as string, postCount: (t.post_count as number) ?? 0 },
        posts: await getPublicPostsByTag(t.name, { limit: postsPerTag }),
      }))
    );

    return shelves.filter((s) => s.posts.length > 0).slice(0, tagLimit);
  } catch (error) {
    console.error("getPublicTagShelves error:", error);
    return [];
  }
}

/**
 * Get feed posts (from followed users or all public posts)
 */

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

    // Get followed IDs, muted user IDs, muted tag IDs, and followed tag IDs (only if logged in)
    let followedIds: string[] = [];
    let mutedIds: string[] = [];
    let mutedTagIds: Set<string> = new Set();
    // Post IDs surfaced because the viewer follows one of their tags.
    let followedTagPostIds: string[] = [];
    if (user) {
      const [{ data: follows }, { data: mutes }, { data: mutedTags }, { data: followedTags }] = await Promise.all([
        supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id),
        supabase
          .from("mutes")
          .select("muted_id")
          .eq("muter_id", user.id),
        supabase
          .from("muted_tags")
          .select("tag_id")
          .eq("profile_id", user.id),
        supabase
          .from("followed_tags")
          .select("tag_id")
          .eq("profile_id", user.id),
      ]);
      mutedIds = (mutes || []).map((m: any) => m.muted_id);
      mutedTagIds = new Set((mutedTags || []).map((mt: any) => mt.tag_id));
      const mutedSet = new Set(mutedIds);
      followedIds = [
        ...(follows || []).map((f: any) => f.following_id).filter((id: string) => !mutedSet.has(id)),
        user.id,
      ];

      // Resolve followed tags → recent post IDs so tag subscriptions show in the feed.
      // Exclude any tags the viewer also muted (mute wins over follow).
      const followedTagIds = (followedTags || [])
        .map((ft: any) => ft.tag_id)
        .filter((id: string) => !mutedTagIds.has(id));
      if (followedTagIds.length > 0) {
        // post_tags has no timestamp of its own, so order by the embedded post's
        // created_at (inner join) to grab the most recent tagged posts.
        const { data: tagPosts } = await supabase
          .from("post_tags")
          .select("post_id, posts!inner(created_at, status)")
          .in("tag_id", followedTagIds)
          .eq("posts.status", "published")
          .order("created_at", { foreignTable: "posts", ascending: false })
          .limit(500);
        followedTagPostIds = [...new Set((tagPosts || []).map((tp: any) => tp.post_id))] as string[];
      }
    }

    // Build and execute the main posts query
    let query = supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        exclude_from_public,
        is_pinned,
        created_at,
        original_post_id,
        reblogged_from_id,
        reblog_comment_html,
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
      .eq("status", "published");

    // Filter to posts from followed users OR posts carrying a followed tag.
    if (user && (followedIds.length > 0 || followedTagPostIds.length > 0)) {
      if (followedTagPostIds.length > 0 && followedIds.length > 0) {
        query = query.or(
          `author_id.in.(${followedIds.join(",")}),id.in.(${followedTagPostIds.join(",")})`
        );
      } else if (followedTagPostIds.length > 0) {
        query = query.in("id", followedTagPostIds);
      } else {
        query = query.in("author_id", followedIds);
      }
    }

    // Exclude muted users' posts
    if (mutedIds.length > 0) {
      query = query.not("author_id", "in", `(${mutedIds.join(",")})`);
    }

    query = query.order("created_at", { ascending: false });
    query = query.range(offset, offset + limit - 1); // PostgREST range is inclusive on both ends

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

    // Batch fetch all stats, interactions, tags, bookmarks, and follow status in parallel
    const uniqueAuthorIds = [...new Set(posts.map((p: any) => p.author_id).filter((id: string) => user && id !== user.id))];

    // Fetch original post authors for reblogs
    const reblogOriginalIds = [...new Set(
      posts.filter((p: any) => p.original_post_id).map((p: any) => p.original_post_id)
    )];

    // Fetch intermediate (reblogged_from) post authors for echo chains
    const reblogChainIds = [...new Set(
      posts.filter((p: any) => p.reblogged_from_id && p.reblogged_from_id !== p.original_post_id)
        .map((p: any) => p.reblogged_from_id)
    )];

    const [stats, followData, originalPostsData, chainPostsData] = await Promise.all([
      batchFetchPostStats(supabase, postIds, user?.id, { includeTags: true, includeBookmarks: true }),
      user && uniqueAuthorIds.length > 0
        ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", uniqueAuthorIds)
        : Promise.resolve({ data: [] }),
      reblogOriginalIds.length > 0
        ? supabase.from("posts").select("id, author:author_id(username, display_name, avatar_url, role)").in("id", reblogOriginalIds).then((res: any) => res, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
      reblogChainIds.length > 0
        ? supabase.from("posts").select("id, author:author_id(username, display_name, avatar_url, role)").in("id", reblogChainIds).then((res: any) => res, () => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]);

    const followingSet = new Set((followData.data || []).map((f: any) => f.following_id));

    // Map original post ID → original author
    const originalAuthorMap = new Map<string, any>();
    for (const op of originalPostsData.data || []) {
      originalAuthorMap.set(op.id, op.author);
    }

    // Map reblogged_from post ID → intermediate author (for echo chains)
    const chainAuthorMap = new Map<string, any>();
    for (const cp of chainPostsData.data || []) {
      chainAuthorMap.set(cp.id, cp.author);
    }

    // Fetch thread lengths for posts that are part of threads
    const threadIds = Array.from(new Set<string>(posts.filter((p: any) => p.thread_id).map((p: any) => p.thread_id)));
    const threadLengthMap = new Map<string, number>();
    if (threadIds.length > 0) {
      // Single query: fetch all published thread members, tally per thread_id in JS.
      const { data: threadRows } = await supabase
        .from("posts")
        .select("thread_id")
        .in("thread_id", threadIds)
        .eq("status", "published");
      for (const row of threadRows || []) {
        if (!row.thread_id) continue;
        threadLengthMap.set(row.thread_id, (threadLengthMap.get(row.thread_id) || 0) + 1);
      }
    }

    let formattedPosts: PostWithDetails[] = posts.map((post: any) => {
      const isReblog = !!post.original_post_id;
      const origAuthor = isReblog ? originalAuthorMap.get(post.original_post_id) : null;

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
        excludeFromPublic: post.exclude_from_public ?? false,
        isPinned: post.is_pinned,
        isOwn: user ? post.author_id === user.id : false,
        isFollowingAuthor: followingSet.has(post.author_id),
        createdAt: formatTimeAgo(post.created_at),
        likeCount: stats.likeCountMap.get(post.id) || 0,
        commentCount: stats.commentCountMap.get(post.id) || 0,
        reblogCount: stats.reblogCountMap.get(post.id) || 0,
        voiceReactionCount: stats.voiceCountMap.get(post.id) || 0,
        hasLiked: stats.userLikeSet.has(post.id),
        hasCommented: stats.userCommentSet.has(post.id),
        hasReblogged: stats.userReblogSet.has(post.id),
        hasBookmarked: stats.userBookmarkSet.has(post.id),
        tags: stats.tagsMap.get(post.id) || [],
        isReblog,
        reblogCommentHtml: post.reblog_comment_html || null,
        originalAuthor: isReblog ? (origAuthor ? {
          username: origAuthor.username || "unknown",
          displayName: origAuthor.display_name,
          avatarUrl: origAuthor.avatar_url,
          role: origAuthor.role || 0,
        } : { username: "deleted", displayName: "Deleted User", avatarUrl: null, role: 0 }) : null,
        rebloggedFromAuthor: isReblog && post.reblogged_from_id && post.reblogged_from_id !== post.original_post_id ? (() => {
          const ca = chainAuthorMap.get(post.reblogged_from_id);
          return ca ? { username: ca.username || "unknown", displayName: ca.display_name, avatarUrl: ca.avatar_url, role: ca.role || 0 } : { username: "deleted", displayName: "Deleted User", avatarUrl: null, role: 0 };
        })() : null,
        threadId: post.thread_id || null,
        threadPosition: post.thread_position || null,
        threadLength: post.thread_id ? (threadLengthMap.get(post.thread_id) || 0) : undefined,
      };
    });

    // Filter out posts with muted tags
    if (mutedTagIds.size > 0) {
      formattedPosts = formattedPosts.filter((post) => {
        const postTags = post.tags || [];
        return !postTags.some((t) => mutedTagIds.has(t.id));
      });
    }

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
