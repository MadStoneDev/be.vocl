"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { IconMicrophone, IconLoader2, IconTrash, IconX } from "@tabler/icons-react";
import { Avatar, toast } from "@/components/ui";
import { VoiceRecorder } from "./create/VoiceRecorder";
import { VoiceClipPlayer } from "./content/VoiceClipPlayer";
import {
  getPostAudioReactions,
  setPostAudioReaction,
  removePostAudioReaction,
  type PostAudioReaction,
} from "@/actions/post-audio-reactions";

interface VoiceReactionsPanelProps {
  postId: string;
  isLoggedIn?: boolean;
  /** Reports the live count up so the action-bar counter stays in sync. */
  onCountChange?: (count: number) => void;
  /** Called when a logged-out viewer tries to add a reaction (→ join). */
  onRequireAuth?: () => void;
}

/**
 * The reactor list for a post's spoken ("voice") reactions, designed to live in
 * the post's expanded-panel slot (opened from the mic button in the action bar).
 * "Add Voice Reaction" is pinned at the top; the mic there opens the recorder.
 */
export function VoiceReactionsPanel({
  postId,
  isLoggedIn = true,
  onCountChange,
  onRequireAuth,
}: VoiceReactionsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<PostAudioReaction[]>([]);
  const [myReactionId, setMyReactionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await getPostAudioReactions(postId);
    if (res.success && res.reactions) {
      setReactions(res.reactions);
      setMyReactionId(res.myReactionId ?? null);
      onCountChange?.(res.reactions.length);
    }
    setLoading(false);
  }, [postId, onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRecorded = useCallback(
    async (url: string, duration: number) => {
      setBusy(true);
      try {
        const res = await setPostAudioReaction(postId, url, duration);
        if (res.success) {
          toast.success("Voice reaction added");
          setRecording(false);
          await load();
        } else {
          toast.error(res.error || "Failed to add reaction");
        }
      } finally {
        setBusy(false);
      }
    },
    [postId, load]
  );

  const handleRemove = useCallback(async () => {
    setBusy(true);
    try {
      const res = await removePostAudioReaction(postId);
      if (res.success) {
        toast.success("Voice reaction removed");
        await load();
      } else {
        toast.error(res.error || "Failed to remove reaction");
      }
    } finally {
      setBusy(false);
    }
  }, [postId, load]);

  return (
    <div className="px-4 py-3">
      {/* Add Voice Reaction — pinned at the top, matching the Like/Reblog pills */}
      {!recording && (
        <button
          type="button"
          onClick={() => (isLoggedIn ? setRecording(true) : onRequireAuth?.())}
          className="mb-3 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 type-meta uppercase tracking-widest font-semibold transition-colors border-vocl-border text-foreground/60 hover:border-vocl-primary hover:text-vocl-primary"
        >
          <IconMicrophone size={14} />
          {myReactionId ? "Re-record" : "Add Voice Reaction"}
        </button>
      )}

      {/* Recorder */}
      {recording && isLoggedIn && (
        <div className="rounded-sm border border-vocl-border p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground/70">Record your reaction</span>
            <button
              type="button"
              onClick={() => setRecording(false)}
              className="text-foreground/40 hover:text-foreground"
              aria-label="Cancel"
            >
              <IconX size={16} />
            </button>
          </div>
          <VoiceRecorder postId={postId} uploadedUrl={null} onComplete={handleRecorded} onClear={() => {}} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-5">
          <IconLoader2 size={20} className="animate-spin text-foreground/40" />
        </div>
      ) : reactions.length === 0 ? (
        !recording && (
          <p className="text-center text-foreground/40 text-sm py-4">
            No voice reactions yet. {isLoggedIn ? "Be the first to speak." : "Sign in to react with your voice."}
          </p>
        )
      ) : (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {reactions.map((r) => (
            <div key={r.id} className="flex gap-2.5">
              {r.reactor ? (
                <Link href={`/profile/${r.reactor.username}`} className="shrink-0 hover:opacity-90 transition-opacity">
                  <Avatar src={r.reactor.avatarUrl || ""} username={r.reactor.username} size="sm" />
                </Link>
              ) : (
                <Avatar src="" username="?" size="sm" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {r.reactor ? (
                    <Link
                      href={`/profile/${r.reactor.username}`}
                      className="font-medium text-sm text-foreground hover:text-vocl-primary transition-colors truncate"
                    >
                      {r.reactor.username}
                    </Link>
                  ) : (
                    <span className="font-medium text-sm text-foreground/50">Someone</span>
                  )}
                  {r.id === myReactionId && (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={busy}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-foreground/40 hover:text-vocl-like transition-colors disabled:opacity-50"
                    >
                      <IconTrash size={13} /> Remove
                    </button>
                  )}
                </div>
                <div className="mt-1">
                  <VoiceClipPlayer src={r.audioUrl} duration={r.duration} variant="light" />
                </div>
                {r.transcript && (
                  <p className="mt-1 text-xs text-foreground/50 italic whitespace-pre-wrap leading-relaxed">
                    &ldquo;{r.transcript}&rdquo;
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
