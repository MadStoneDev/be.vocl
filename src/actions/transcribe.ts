"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/openai/whisper";

/**
 * Transcribe a voice-note audio post via Whisper and write the transcript
 * into post.content.transcript. Idempotent — does nothing if already transcribed.
 *
 * Designed to be called from the client after publish (fire-and-forget) or from
 * a server action via `after()`. Uses the admin client so it works even when
 * triggered async after the user's session has rotated.
 */
export async function transcribePostAudio(postId: string): Promise<{ success: boolean; transcript?: string; error?: string }> {
  try {
    const supabase = createAdminClient();
    const { data: post, error } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content")
      .eq("id", postId)
      .single();

    if (error || !post) return { success: false, error: "Post not found" };
    if (post.post_type !== "audio") return { success: false, error: "Not an audio post" };

    const content = (post.content || {}) as any;
    if (content.transcript) return { success: true, transcript: content.transcript };
    if (!content.url) return { success: false, error: "No audio URL on post" };

    const transcript = await transcribeAudio(content.url);
    if (!transcript) return { success: false, error: "Transcription failed" };

    const updated = { ...content, transcript };
    const { error: updateErr } = await (supabase as any)
      .from("posts")
      .update({ content: updated })
      .eq("id", postId);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true, transcript };
  } catch (e: any) {
    return { success: false, error: e.message || "Unexpected error" };
  }
}
