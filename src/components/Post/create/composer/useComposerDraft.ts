"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ComposerState } from "./useComposerState";
import { serializeForDraft } from "./useComposerState";

const STORAGE_PREFIX = "vocl:composer-draft:";
const DEBOUNCE_MS = 800;

export type DraftStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number };

interface UseComposerDraftOptions {
  /** "new" for a fresh post, or the edited post id. */
  draftKey: string;
  state: ComposerState;
  /** Disable autosave (e.g. while edit-mode is hydrating, or in edit mode). */
  enabled?: boolean;
}

interface UseComposerDraftReturn {
  status: DraftStatus;
  /** Read a persisted draft (call once on mount before hydrating state). */
  loadDraft: () => Partial<ComposerState> | null;
  /** Remove the persisted draft (call after a successful publish). */
  clearDraft: () => void;
}

function storageKey(draftKey: string) {
  return `${STORAGE_PREFIX}${draftKey}`;
}

export function useComposerDraft({
  draftKey,
  state,
  enabled = true,
}: UseComposerDraftOptions): UseComposerDraftReturn {
  const [status, setStatus] = useState<DraftStatus>({ kind: "idle" });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip persisting on the very first render so loading a draft doesn't
  // immediately re-write it (and so a freshly reset editor stays clean).
  const isFirstRun = useRef(true);
  // Once the draft is cleared (post published), stop all further writes for the
  // life of this mount — otherwise an in-flight debounced save fires AFTER the
  // clear and re-persists the just-published content (it reappears next open).
  const stoppedRef = useRef(false);

  const loadDraft = useCallback((): Partial<ComposerState> | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(storageKey(draftKey));
      if (!raw) return null;
      return JSON.parse(raw) as Partial<ComposerState>;
    } catch {
      return null;
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    // Cancel any pending debounced save and block future ones, then remove.
    stoppedRef.current = true;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(storageKey(draftKey));
    } catch {
      // ignore
    }
    setStatus({ kind: "idle" });
  }, [draftKey]);

  useEffect(() => {
    if (!enabled || stoppedRef.current) return;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    setStatus({ kind: "saving" });
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      try {
        const payload = serializeForDraft(state);
        window.localStorage.setItem(storageKey(draftKey), JSON.stringify(payload));
        setStatus({ kind: "saved", at: Date.now() });
      } catch {
        setStatus({ kind: "idle" });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [state, draftKey, enabled]);

  return { status, loadDraft, clearDraft };
}

/** Human-readable "Draft saved · 2s ago" style label. */
export function formatDraftStatus(status: DraftStatus, now: number): string {
  if (status.kind === "saving") return "Saving…";
  if (status.kind === "saved") {
    const seconds = Math.max(0, Math.round((now - status.at) / 1000));
    if (seconds < 2) return "Draft saved · just now";
    if (seconds < 60) return `Draft saved · ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `Draft saved · ${minutes}m ago`;
  }
  return "";
}
