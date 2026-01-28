"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
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
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { postType, content, isSensitive, tags, publishMode, scheduledFor } = input;

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
      })
      .select("id")
      .single();

    if (postError) {
      console.error("Create post error:", postError);
      return { success: false, error: "Failed to create post" };
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
