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
} from "@tabler/icons-react";
import type { PublishMode } from "./useComposerState";
import { type DraftStatus, formatDraftStatus } from "./useComposerDraft";

interface ComposerTopBarProps {
  mode: "create" | "edit";
  publishMode: PublishMode;
  onPublishModeChange: (mode: PublishMode) => void;
  draftStatus: DraftStatus;
  showPreview: boolean;
  onTogglePreview: () => void;
  onClose: () => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel?: string;
}

export function ComposerTopBar({
  mode,
  publishMode,
  onPublishModeChange,
  draftStatus,
  showPreview,
  onTogglePreview,
  onClose,
  onSubmit,
  isPending,
  submitLabel,
}: ComposerTopBarProps) {
  const [now, setNow] = useState(() => Date.now());
  const [publishMenuOpen, setPublishMenuOpen] = useState(false);

  // Tick so the "saved Ns ago" label stays fresh.
  useEffect(() => {
    if (draftStatus.kind !== "saved") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [draftStatus]);

  const draftLabel = formatDraftStatus(draftStatus, now);

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
          className="flex items-center justify-center w-9 h-9 -ml-1 rounded-none text-foreground/60 hover:text-foreground hover:bg-[var(--vocl-hover)] transition-colors"
          aria-label="Close composer"
        >
          <IconX size={20} />
        </button>
        <span className="min-w-0 select-none">
          <span className="block kicker kicker-accent">
            {mode === "edit" ? "Edit post" : "File a post"}
          </span>
          <span className="block font-display text-lg leading-tight text-ink">
            {mode === "edit" ? "Revise" : "New entry"}
          </span>
        </span>
        {draftLabel && (
          <span className="hidden sm:inline slug text-meta-dim truncate">
            {draftLabel}
          </span>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        {/* Preview toggle */}
        <button
          type="button"
          onClick={onTogglePreview}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-none font-sans uppercase tracking-[0.14em] text-xs border transition-colors ${
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
            className={`flex items-center gap-1.5 px-4 h-9 font-sans font-medium uppercase tracking-[0.16em] text-xs text-white transition-colors disabled:opacity-60 ${
              mode === "create" ? "pr-3 rounded-none" : "rounded-none"
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
              onClick={() => setPublishMenuOpen((v) => !v)}
              disabled={isPending}
              className="flex items-center justify-center w-8 h-9 rounded-none text-white border-l border-white/20 transition-colors disabled:opacity-60"
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
              <div className="absolute right-0 top-11 z-50 w-56 rounded-none border border-[var(--vocl-border)] bg-vocl-surface-dark overflow-hidden p-1">
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
                    className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-none text-left transition-colors ${
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
                      <span className="block type-body font-medium text-foreground">
                        {label}
                      </span>
                      <span className="block type-meta text-foreground/45">
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
