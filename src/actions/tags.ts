"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Follow a tag
 */
export async function followTag(tagId: string): Promise<{
  success: boolean;
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

    // Check if already following
    const { data: existing } = await supabase
      .from("followed_tags")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("tag_id", tagId)
      .single();

    if (existing) {
      return { success: true }; // Already following
    }

    const { error } = await supabase.from("followed_tags").insert({
      profile_id: user.id,
      tag_id: tagId,
    });

    if (error) {
      console.error("Follow tag error:", error);
      return { success: false, error: "Failed to follow tag" };
    }

    revalidatePath("/search");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Follow tag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Follow a tag by name (creates tag if it doesn't exist)
 */
export async function followTagByName(tagName: string): Promise<{
  success: boolean;
  tagId?: string;
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

    const normalizedName = tagName.toLowerCase().trim().replace(/^#/, "");

    // Find or create the tag
    let { data: tag } = await supabase
      .from("tags")
      .select("id")
      .eq("name", normalizedName)
      .single();

    if (!tag) {
      const { data: newTag, error: createError } = await supabase
        .from("tags")
        .insert({ name: normalizedName, post_count: 0 })
        .select("id")
        .single();

      if (createError) {
        console.error("Create tag error:", createError);
        return { success: false, error: "Failed to create tag" };
      }
      tag = newTag;
    }

    if (!tag) {
      return { success: false, error: "Failed to get tag" };
    }

    // Follow the tag
    const result = await followTag(tag.id);
    return { ...result, tagId: tag.id };
  } catch (error) {
    console.error("Follow tag by name error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unfollow a tag
 */
export async function unfollowTag(tagId: string): Promise<{
  success: boolean;
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

    const { error } = await supabase
      .from("followed_tags")
      .delete()
      .eq("profile_id", user.id)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Unfollow tag error:", error);
      return { success: false, error: "Failed to unfollow tag" };
    }

    revalidatePath("/search");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Unfollow tag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user is following a tag
 */
export async function isFollowingTag(tagId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from("followed_tags")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("tag_id", tagId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get tags the current user is following
 */
export async function getFollowedTags(): Promise<{
  success: boolean;
  tags?: Array<{
    id: string;
    name: string;
    postCount: number;
  }>;
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

    const { data: followedTags, error } = await supabase
      .from("followed_tags")
      .select(`
        tag_id,
        tag:tag_id (
          id,
          name,
          post_count
        )
      `)
      .eq("profile_id", user.id);

    if (error) {
      console.error("Get followed tags error:", error);
      return { success: false, error: "Failed to get followed tags" };
    }

    type FollowedTagResult = {
      tag_id: string;
      tag: { id: string; name: string; post_count: number } | null;
    };

    const tags = ((followedTags || []) as FollowedTagResult[])
      .filter((ft) => ft.tag)
      .map((ft) => ({
        id: ft.tag!.id,
        name: ft.tag!.name,
        postCount: ft.tag!.post_count,
      }));

    return { success: true, tags };
  } catch (error) {
    console.error("Get followed tags error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tags for a specific post
 */
export async function getPostTags(postId: string): Promise<{
  success: boolean;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: postTags, error } = await supabase
      .from("post_tags")
      .select(`
        tag_id,
        tag:tag_id (
          id,
          name
        )
      `)
      .eq("post_id", postId);

    if (error) {
      console.error("Get post tags error:", error);
      return { success: false, error: "Failed to get post tags" };
    }

    type PostTagResult = {
      tag_id: string;
      tag: { id: string; name: string } | null;
    };

    const tags = ((postTags || []) as PostTagResult[])
      .filter((pt) => pt.tag)
      .map((pt) => ({
        id: pt.tag!.id,
        name: pt.tag!.name,
      }));

    return { success: true, tags };
  } catch (error) {
    console.error("Get post tags error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tags for multiple posts (batch)
 */
export async function getPostTagsBatch(postIds: string[]): Promise<{
  success: boolean;
  tagsByPostId?: Record<string, Array<{ id: string; name: string }>>;
  error?: string;
}> {
  try {
    if (postIds.length === 0) {
      return { success: true, tagsByPostId: {} };
    }

    const supabase = await createClient();

    const { data: postTags, error } = await supabase
      .from("post_tags")
      .select(`
        post_id,
        tag_id,
        tag:tag_id (
          id,
          name
        )
      `)
      .in("post_id", postIds);

    if (error) {
      console.error("Get post tags batch error:", error);
      return { success: false, error: "Failed to get post tags" };
    }

    type PostTagResult = {
      post_id: string;
      tag_id: string;
      tag: { id: string; name: string } | null;
    };

    const tagsByPostId: Record<string, Array<{ id: string; name: string }>> = {};

    for (const postId of postIds) {
      tagsByPostId[postId] = [];
    }

    for (const pt of (postTags || []) as PostTagResult[]) {
      if (pt.tag && tagsByPostId[pt.post_id]) {
        tagsByPostId[pt.post_id].push({
          id: pt.tag.id,
          name: pt.tag.name,
        });
      }
    }

    return { success: true, tagsByPostId };
  } catch (error) {
    console.error("Get post tags batch error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
