"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface DraftsResult {
  success: boolean;
  posts?: any[];
  error?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function getDrafts(): Promise<DraftsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content, created_at, updated_at, tags")
      .eq("status", "draft")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false });

    if (error) {
      return { success: false, error: "Failed to fetch drafts" };
    }

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get drafts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getScheduledPosts(): Promise<DraftsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content, created_at, updated_at, scheduled_for, tags")
      .eq("status", "scheduled")
      .eq("author_id", user.id)
      .order("scheduled_for", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch scheduled posts" };
    }

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get scheduled posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function getQueuedPosts(): Promise<DraftsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content, created_at, updated_at, queue_position, tags")
      .eq("status", "queued")
      .eq("author_id", user.id)
      .order("queue_position", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch queued posts" };
    }

    return { success: true, posts: posts || [] };
  } catch (error) {
    console.error("Get queued posts error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function deleteDraft(postId: string): Promise<ActionResult> {
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
      return { success: false, error: "Failed to delete draft" };
    }

    revalidatePath("/drafts");
    return { success: true };
  } catch (error) {
    console.error("Delete draft error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

export async function publishDraft(postId: string): Promise<ActionResult> {
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
      .select("author_id, status")
      .eq("id", postId)
      .single();

    if (!existingPost || existingPost.author_id !== user.id) {
      return { success: false, error: "Post not found or unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("posts")
      .update({ status: "published", updated_at: new Date().toISOString() })
      .eq("id", postId);

    if (error) {
      return { success: false, error: "Failed to publish draft" };
    }

    revalidatePath("/drafts");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Publish draft error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
