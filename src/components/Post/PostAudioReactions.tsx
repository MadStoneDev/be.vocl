"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  IconMicrophone,
  IconChevronDown,
  IconLoader2,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { Avatar, toast } from "@/components/ui";
import { VoiceRecorder } from "./create/VoiceRecorder";
import { VoiceClipPlayer } from "./content/VoiceClipPlayer";
import {
  getPostAudioReactions,
  setPostAudioReaction,
  removePostAudioReaction,
  type PostAudioReaction,
} from "@/actions/post-audio-reactions";

interface PostAudioReactionsProps {
  postId: string;
  /** Initial count if known (avoids a flash before first load). */
  initialCount?: number;
  isLoggedIn?: boolean;
}

/**
 * Spoken ("voice react") reactions for a post. Renders a tasteful, theme-aware
 * bar with a mic affordance + count; expands into a popover listing each
 * reactor's avatar, a compact audio player (reusing VoiceClipPlayer), and any
 * transcript. Recording reuses the shared VoiceRecorder + presigned R2 flow.
 *
 * Self-contained: lazily loads its own data so the memoized Post tree is not
 * disturbed.
 */
export function PostAudioReactions({
  postId,
  initialCount = 0,
  isLoggedIn = true,
}: PostAudioReactionsProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState<PostAudioReaction[]>([]);
  const [count, setCount] = useState(initialCount);
  const [myReactionId, setMyReactionId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPostAudioReactions(postId);
      if (res.success && res.reactions) {
        setReactions(res.reactions);
        setCount(res.reactions.length);
        setMyReactionId(res.myReactionId ?? null);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && !loaded) void load();
      return next;
    });
  }, [loaded, load]);

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
    <div className="bg-vocl-surface border-t border-neutral-200/70">
      {/* Affordance row */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={toggleOpen}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-vocl-primary transition-colors"
          aria-expanded={open}
          aria-label={`${count} voice reaction${count === 1 ? "" : "s"}`}
        >
          <IconMicrophone size={18} />
          <span className="font-medium">{count > 0 ? count : "Voice react"}</span>
          {count > 0 && (
            <IconChevronDown
              size={14}
              className={`transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            />
          )}
        </button>

        {isLoggedIn && !recording && (
          <button
            type="button"
            onClick={() => {
              setRecording(true);
              setOpen(true);
              if (!loaded) void load();
            }}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-vocl-primary/10 text-vocl-primary text-xs font-medium hover:bg-vocl-primary/20 transition-colors"
          >
            <IconMicrophone size={14} />
            {myReactionId ? "Re-react" : "Speak"}
          </button>
        )}
      </div>

      {/* Expanded panel */}
      <div
        className="overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ maxHeight: open ? "420px" : "0px", opacity: open ? 1 : 0 }}
      >
        <div className="px-3 pb-3 space-y-3">
          {/* Recorder */}
          {recording && isLoggedIn && (
            <div className="rounded-xl border border-vocl-border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-neutral-600">
                  Record your reaction
                </span>
                <button
                  type="button"
                  onClick={() => setRecording(false)}
                  className="text-neutral-400 hover:text-neutral-700"
                  aria-label="Cancel"
                >
                  <IconX size={16} />
                </button>
              </div>
              <VoiceRecorder
                postId={postId}
                uploadedUrl={null}
                onComplete={handleRecorded}
                onClear={() => {}}
              />
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <IconLoader2 size={20} className="animate-spin text-neutral-400" />
            </div>
          ) : reactions.length === 0 ? (
            !recording && (
              <p className="text-center text-neutral-400 text-sm py-3">
                No voice reactions yet.
              </p>
            )
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {reactions.map((r) => (
                <div key={r.id} className="flex gap-2.5">
                  {r.reactor ? (
                    <Link
                      href={`/profile/${r.reactor.username}`}
                      className="shrink-0 hover:opacity-90 transition-opacity"
                    >
                      <Avatar
                        src={r.reactor.avatarUrl || ""}
                        username={r.reactor.username}
                        size="sm"
                      />
                    </Link>
                  ) : (
                    <Avatar src="" username="?" size="sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {r.reactor ? (
                        <Link
                          href={`/profile/${r.reactor.username}`}
                          className="font-medium text-sm text-neutral-800 hover:text-vocl-primary transition-colors truncate"
                        >
                          {r.reactor.username}
                        </Link>
                      ) : (
                        <span className="font-medium text-sm text-neutral-500">
                          Someone
                        </span>
                      )}
                      {r.id === myReactionId && (
                        <button
                          type="button"
                          onClick={handleRemove}
                          disabled={busy}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-vocl-like transition-colors disabled:opacity-50"
                        >
                          <IconTrash size={13} /> Remove
                        </button>
                      )}
                    </div>
                    <div className="mt-1">
                      <VoiceClipPlayer
                        src={r.audioUrl}
                        duration={r.duration}
                        variant="light"
                      />
                    </div>
                    {r.transcript && (
                      <p className="mt-1 text-xs text-neutral-500 italic whitespace-pre-wrap leading-relaxed">
                        &ldquo;{r.transcript}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
