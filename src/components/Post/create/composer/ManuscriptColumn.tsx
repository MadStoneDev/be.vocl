"use client";

import { IconBook } from "@tabler/icons-react";
import { EditorialEditor } from "./EditorialEditor";
import { ComposerHero } from "./ComposerHero";
import { LinkPreviewCarousel } from "@/components/Post/content/LinkPreviewCarousel";
import { countWords, readingTimeMinutes, isEssayLength } from "@/lib/essay";
import type { ComposerState } from "./useComposerState";
import type { LinkPreviewData } from "@/types/database";

interface ManuscriptColumnProps {
  state: ComposerState;
  patch: (payload: Partial<ComposerState>) => void;
  mode: "create" | "edit";
  linkPreviews: LinkPreviewData[];
  linkPreviewsLoading: boolean;
  onDismissPreview: (url: string) => void;
}

export function ManuscriptColumn({
  state,
  patch,
  mode,
  linkPreviews,
  linkPreviewsLoading,
  onDismissPreview,
}: ManuscriptColumnProps) {
  const { postType } = state;
  const isText = postType === "text";
  const isPoll = postType === "poll";
  const isMedia = postType === "image" || postType === "video" || postType === "audio" || postType === "gif";

  return (
    <div className="mx-auto w-full max-w-[680px] px-5 py-10 md:py-12">
      {/* Media / poll hero block at the TOP of the column */}
      {(isMedia || isPoll) && (
        <div className="mb-8">
          <ComposerHero state={state} patch={patch} />
        </div>
      )}

      {/* Essay title — unboxed display heading you type into */}
      {isText && state.isEssay && (
        <input
          type="text"
          value={state.essayTitle}
          onChange={(e) => patch({ essayTitle: e.target.value })}
          placeholder="Title"
          maxLength={140}
          className="type-display-lg w-full bg-transparent border-0 p-0 mb-6 text-foreground placeholder:text-foreground/25 focus:outline-none"
        />
      )}

      {/* Body / caption editor (not for polls) */}
      {!isPoll && (
        <>
          {isMedia && (
            <p className="text-xs text-foreground/45 mb-2">Caption (optional)</p>
          )}
          <div className={isText ? "type-body-lg" : ""}>
            <EditorialEditor
              html={state.content.html}
              onChange={(html, plain) => patch({ content: { html, plain } })}
              uploadPostId={state.postId}
              placeholder={
                isText
                  ? state.isEssay
                    ? "Start writing your story…"
                    : "What's on your mind?"
                  : "Add a caption…"
              }
            />
          </div>

          {/* Essay toggle + word count (create mode only — matches original) */}
          {isText && mode === "create" && (
            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => patch({ isEssay: !state.isEssay })}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-colors ${
                  state.isEssay
                    ? "text-[var(--vocl-primary)]"
                    : "bg-[var(--vocl-hover)] text-foreground/60 hover:text-foreground"
                }`}
                style={
                  state.isEssay
                    ? { backgroundColor: "color-mix(in srgb, var(--vocl-primary) 15%, transparent)" }
                    : undefined
                }
              >
                <IconBook size={14} />
                {state.isEssay ? "Story mode on" : "Write as story"}
              </button>
              {state.content.plain && (
                <span className="text-foreground/45">
                  {countWords(state.content.plain).toLocaleString()} words
                  {isEssayLength(state.content.plain) && (
                    <> · {readingTimeMinutes(state.content.plain)} min read</>
                  )}
                </span>
              )}
            </div>
          )}

          {/* Link previews for text posts */}
          {isText && (linkPreviews.length > 0 || linkPreviewsLoading) && (
            <div className="mt-4">
              <LinkPreviewCarousel
                previews={linkPreviews}
                editable
                onDismiss={onDismissPreview}
                isLoading={linkPreviewsLoading}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
