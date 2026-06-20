"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/openai/whisper";
import { rateLimiters } from "@/lib/rate-limit";

export interface PostAudioReaction {
  id: string;
  postId: string;
  audioUrl: string;
  duration: number | null;
  transcript: string | null;
  createdAt: string;
  reactor: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

/**
 * Set (create or replace) the current user's spoken reaction on a post.
 * The post_audio_reactions table has UNIQUE(post_id, user_id), so we upsert on
 * that conflict to replace any prior reaction by this user.
 *
 * Audio is uploaded client-side via the existing post-audio presign flow; this
 * action only persists the resulting URL + duration. Transcription runs
 * best-effort after the response so it never blocks the reaction.
 */
export async function setPostAudioReaction(
  postId: string,
  audioUrl: string,
  duration: number
): Promise<{ success: boolean; reactionId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    if (!audioUrl || typeof audioUrl !== "string") {
      return { success: false, error: "Audio is required" };
    }

    // Rate limit: reuse the upload limiter (50/hr/user).
    const rateLimit = rateLimiters.upload(`audio-reaction:${user.id}`);
    if (!rateLimit.allowed) {
      return { success: false, error: "Too many reactions. Please try again later." };
    }

    // Verify the post exists (and is visible to the caller under RLS).
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (!post) return { success: false, error: "Post not found" };

    const { data: reaction, error } = await (supabase as any)
      .from("post_audio_reactions")
      .upsert(
        {
          post_id: postId,
          user_id: user.id,
          audio_url: audioUrl,
          duration: Number.isFinite(duration) ? Math.round(duration) : null,
          // Clear any stale transcript from a replaced reaction; re-derived below.
          transcript: null,
        },
        { onConflict: "post_id,user_id" }
      )
      .select("id")
      .single();

    if (error) {
      console.error("Set audio reaction error:", error);
      return { success: false, error: "Failed to save reaction" };
    }

    // Best-effort transcription, after the response is sent.
    const reactionId = reaction.id as string;
    after(async () => {
      try {
        const transcript = await transcribeAudio(audioUrl);
        if (!transcript) return;
        const admin = createAdminClient();
        await (admin as any)
          .from("post_audio_reactions")
          .update({ transcript })
          .eq("id", reactionId);
      } catch {
        // best-effort; ignore
      }
    });

    return { success: true, reactionId };
  } catch (e: any) {
    console.error("Set audio reaction error:", e);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Remove the current user's spoken reaction from a post.
 */
export async function removePostAudioReaction(
  postId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await (supabase as any)
      .from("post_audio_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Remove audio reaction error:", error);
      return { success: false, error: "Failed to remove reaction" };
    }

    return { success: true };
  } catch (e: any) {
    console.error("Remove audio reaction error:", e);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Load all spoken reactions for a post, with reactor username/avatar, plus a
 * flag for whether the current user has already reacted.
 */
export async function getPostAudioReactions(
  postId: string
): Promise<{
  success: boolean;
  reactions?: PostAudioReaction[];
  myReactionId?: string | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await (supabase as any)
      .from("post_audio_reactions")
      .select(`
        id,
        post_id,
        audio_url,
        duration,
        transcript,
        created_at,
        user_id,
        reactor:profiles!post_audio_reactions_user_id_fkey(id, username, avatar_url)
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get audio reactions error:", error);
      return { success: false, error: "Failed to load reactions" };
    }

    const reactions: PostAudioReaction[] = (data || []).map((r: any) => ({
      id: r.id,
      postId: r.post_id,
      audioUrl: r.audio_url,
      duration: r.duration,
      transcript: r.transcript,
      createdAt: r.created_at,
      reactor: r.reactor
        ? {
            id: r.reactor.id,
            username: r.reactor.username,
            avatarUrl: r.reactor.avatar_url,
          }
        : null,
    }));

    const myReactionId = user
      ? (data || []).find((r: any) => r.user_id === user.id)?.id ?? null
      : null;

    return { success: true, reactions, myReactionId };
  } catch (e: any) {
    console.error("Get audio reactions error:", e);
    return { success: false, error: "An unexpected error occurred" };
  }
}
