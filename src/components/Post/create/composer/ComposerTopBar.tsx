"use client";

import { useEffect, useState } from "react";
import {
  IconX,
  IconSend,
  IconClock,
  IconCalendar,
  IconChevronDown,
  IconLoader2,
  IconEye,
  IconEyeOff,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconGif,
  IconChartBar,
} from "@tabler/icons-react";
import type { PostType, PublishMode } from "./useComposerState";
import { type DraftStatus, formatDraftStatus } from "./useComposerDraft";

const POST_TYPES: { type: PostType; icon: typeof IconFileText; label: string }[] = [
  { type: "text", icon: IconFileText, label: "Text" },
  { type: "image", icon: IconPhoto, label: "Image" },
  { type: "video", icon: IconVideo, label: "Video" },
  { type: "audio", icon: IconMusic, label: "Audio" },
  { type: "gif", icon: IconGif, label: "GIF" },
  { type: "poll", icon: IconChartBar, label: "Poll" },
];

interface ComposerTopBarProps {
  mode: "create" | "edit";
  postType: PostType;
  onPostTypeChange: (type: PostType) => void;
  publishMode: PublishMode;
  onPublishModeChange: (mode: PublishMode) => void;
  draftStatus: DraftStatus;
  showPreview: boolean;
  onTogglePreview: () => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  /** Disable type switching (edit mode locks the post type). */
  lockType?: boolean;
  submitLabel?: string;
}

export function ComposerTopBar({
  mode,
  postType,
  onPostTypeChange,
  publishMode,
  onPublishModeChange,
  draftStatus,
  showPreview,
  onTogglePreview,
  onClose,
  onSubmit,
  isPending,
  lockType = false,
  submitLabel,
}: ComposerTopBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);

  // Tick so the "saved Ns ago" label stays fresh.
  useEffect(() => {
    if (draftStatus.kind !== "saved") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [draftStatus]);

  const draftLabel = formatDraftStatus(draftStatus, now);
  const ActiveTypeIcon =
    POST_TYPES.find((t) => t.type === postType)?.icon || IconFileText;
  const activeTypeLabel =
    POST_TYPES.find((t) => t.type === postType)?.label || "Text";

  const publishVerb =
    publishMode === "queue"
      ? "Add to Queue"
      : publishMode === "schedule"
        ? "Schedule"
        : "Publish";
  const PublishIcon =
    publishMode === "queue"
      ? IconClock
      : publishMode === "schedule"
        ? IconCalendar
        : IconSend;

  return (
    <header className="flex items-center justify-between gap-3 px-4 md:px-6 h-14 border-b border-[var(--vocl-border)] shrink-0">
      {/* Left: wordmark + autosave */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-9 h-9 -ml-1 rounded-full text-foreground/60 hover:text-foreground hover:bg-[var(--vocl-hover)] transition-colors"
          aria-label="Close composer"
        >
          <IconX size={20} />
        </button>
        <span
          className="font-bold text-lg tracking-tight select-none"
          style={{ color: "var(--vocl-primary)" }}
        >
          be.vocl
        </span>
        {draftLabel && (
          <span className="hidden sm:inline text-xs text-foreground/45 truncate">
            {draftLabel}
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Post-type switcher (hidden / locked in edit mode) */}
        {!lockType && (
          <div className="relative hidden xs:block">
            <button
              type="button"
              onClick={() => {
                setTypeMenuOpen((v) => !v);
                setPublishMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 h-9 rounded-full text-sm text-foreground/80 hover:bg-[var(--vocl-hover)] border border-[var(--vocl-border)] transition-colors"
            >
              <ActiveTypeIcon size={16} />
              <span className="hidden md:inline">{activeTypeLabel}</span>
              <IconChevronDown size={14} />
            </button>
            {typeMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setTypeMenuOpen(false)}
                />
                <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border border-[var(--vocl-border)] bg-vocl-surface-dark shadow-xl overflow-hidden p-1">
                  {POST_TYPES.map(({ type, icon: Icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        onPostTypeChange(type);
                        setTypeMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                        postType === type
                          ? "bg-[var(--vocl-hover)] text-foreground"
                          : "text-foreground/70 hover:bg-[var(--vocl-hover)]"
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview toggle */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-sm border transition-colors ${
            showPreview
              ? "border-[var(--vocl-primary)] text-[var(--vocl-primary)]"
              : "border-[var(--vocl-border)] text-foreground/80 hover:bg-[var(--vocl-hover)]"
          }`}
        >
          {showPreview ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          <span className="hidden md:inline">Preview</span>
        </button>

        {/* Publish split-button */}
        <div className="relative flex items-center">
          <button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
            className={`flex items-center gap-1.5 px-4 h-9 text-sm font-semibold text-white transition-colors disabled:opacity-60 ${
              mode === "create" ? "pr-3 rounded-l-full" : "rounded-full"
            }`}
            style={{ backgroundColor: "var(--vocl-primary)" }}
          >
            {isPending ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <PublishIcon size={16} />
            )}
            {submitLabel || publishVerb}
          </button>
          {mode === "create" && (
            <button
              type="button"
              onClick={() => {
                setPublishMenuOpen((v) => !v);
                setTypeMenuOpen(false);
              }}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-9 rounded-r-full text-white border-l border-white/20 transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--vocl-primary)" }}
              aria-label="Publish options"
            >
              <IconChevronDown size={16} />
            </button>
          )}

          {publishMenuOpen && mode === "create" && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setPublishMenuOpen(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-[var(--vocl-border)] bg-vocl-surface-dark shadow-xl overflow-hidden p-1">
                {[
                  { m: "now" as const, icon: IconSend, label: "Post now", sub: "Publish immediately" },
                  { m: "queue" as const, icon: IconClock, label: "Add to queue", sub: "Use your queue schedule" },
                  { m: "schedule" as const, icon: IconCalendar, label: "Schedule", sub: "Pick a date & time" },
                ].map(({ m, icon: Icon, label, sub }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onPublishModeChange(m);
                      setPublishMenuOpen(false);
                    }}
                    className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg text-left transition-colors ${
                      publishMode === m
                        ? "bg-[var(--vocl-hover)]"
                        : "hover:bg-[var(--vocl-hover)]"
                    }`}
                  >
                    <Icon
                      size={16}
                      className="mt-0.5"
                      style={
                        publishMode === m
                          ? { color: "var(--vocl-primary)" }
                          : undefined
                      }
                    />
                    <span className="flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {label}
                      </span>
                      <span className="block text-xs text-foreground/45">
                        {sub}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
