"use client";

import { useState, useTransition, useEffect } from "react";
import Image from "next/image";
import {
  IconX,
  IconSend,
  IconClock,
  IconCalendar,
  IconLoader2,
  IconRefresh,
} from "@tabler/icons-react";
import { RichTextEditor } from "@/components/Post/create/RichTextEditor";
import { SchedulePicker } from "./SchedulePicker";
import { reblogPost } from "@/actions/reblogs";

interface OriginalPost {
  id: string;
  author: {
    username: string;
    avatarUrl?: string;
  };
  contentPreview: string;
  imageUrl?: string;
}

interface ReblogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalPost: OriginalPost;
  defaultMode?: ReblogMode;
  onSuccess?: (postId: string) => void;
}

type ReblogMode = "now" | "queue" | "schedule";

export function ReblogDialog({
  isOpen,
  onClose,
  originalPost,
  defaultMode = "now",
  onSuccess,
}: ReblogDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ReblogMode>(defaultMode);
  const [comment, setComment] = useState({ html: "", plain: "" });
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset mode and clear form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setComment({ html: "", plain: "" });
      setScheduledDate(null);
      setError(null);
    }
  }, [isOpen, defaultMode]);

  const handleSubmit = async () => {
    setError(null);

    // Validate schedule mode
    if (mode === "schedule" && !scheduledDate) {
      setError("Please select a date and time");
      return;
    }

    startTransition(async () => {
      const reblogMode = mode === "now" ? "standard" : mode;
      const result = await reblogPost(originalPost.id, reblogMode, {
        comment: comment.html || undefined,
        scheduledFor: scheduledDate?.toISOString(),
      });

      if (result.success && result.postId) {
        onSuccess?.(result.postId);
        onClose();
      } else {
        setError(result.error || "Failed to reblog");
      }
    });
  };

  if (!isOpen) return null;

  const modes = [
    { id: "now" as const, icon: IconSend, label: "Post now" },
    { id: "queue" as const, icon: IconClock, label: "Add to queue" },
    { id: "schedule" as const, icon: IconCalendar, label: "Schedule" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-vocl-surface-dark rounded-3xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconRefresh size={20} className="text-vocl-accent" />
            <h2 className="font-semibold text-foreground">Reblog</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Original Post Preview */}
          <div className="p-3 rounded-xl bg-background/50 border border-white/5">
            <div className="flex gap-3">
              {originalPost.imageUrl && (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={originalPost.imageUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {originalPost.author.avatarUrl && (
                    <div className="relative w-5 h-5 rounded-full overflow-hidden">
                      <Image
                        src={originalPost.author.avatarUrl}
                        alt=""
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                  <span className="text-sm font-medium text-foreground">
                    @{originalPost.author.username}
                  </span>
                </div>
                <p className="text-sm text-foreground/60 line-clamp-2">
                  {originalPost.contentPreview}
                </p>
              </div>
            </div>
          </div>

          {/* Add comment */}
          <div>
            <label className="block text-sm text-foreground/60 mb-2">
              Add your thoughts (optional)
            </label>
            <RichTextEditor
              placeholder="What do you think about this?"
              onChange={(html, plain) => setComment({ html, plain })}
              minHeight="80px"
            />
          </div>

          {/* Mode Selection */}
          <div>
            <label className="block text-sm text-foreground/60 mb-2">
              When to post
            </label>
            <div className="flex rounded-xl bg-background/50 p-1">
              {modes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    mode === id
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Picker */}
          {mode === "schedule" && (
            <SchedulePicker
              value={scheduledDate || undefined}
              onChange={setScheduledDate}
            />
          )}

          {/* Queue info */}
          {mode === "queue" && (
            <p className="text-sm text-foreground/50 p-3 rounded-xl bg-background/30">
              This will be added to your queue and posted automatically based on
              your queue settings.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  {mode === "queue"
                    ? "Adding..."
                    : mode === "schedule"
                    ? "Scheduling..."
                    : "Reblogging..."}
                </>
              ) : mode === "queue" ? (
                "Add to queue"
              ) : mode === "schedule" ? (
                "Schedule"
              ) : (
                "Reblog now"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
