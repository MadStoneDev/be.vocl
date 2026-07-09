"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IconAdjustmentsHorizontal, IconX } from "@tabler/icons-react";
import { Portal } from "@/components/ui";
import { useLinkPreviews } from "@/hooks/useLinkPreviews";
import { getMyCommunities, type CommunitySummary } from "@/actions/communities";
import { getMyCollections, type MyCollection } from "@/actions/post-threads";
import { readingTimeMinutes } from "@/lib/essay";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  GalleryPostContent,
  LinkPreviewData,
} from "@/types/database";
import {
  useComposerState,
  createInitialState,
  type ComposerState,
  type PostType,
  type ComposerMode,
} from "./useComposerState";
import { useComposerDraft } from "./useComposerDraft";
import { ComposerTopBar } from "./ComposerTopBar";
import { ManuscriptColumn } from "./ManuscriptColumn";
import { ComposerInspector } from "./ComposerInspector";

export interface ExistingPostData {
  id: string;
  postType: string;
  content: any;
  isSensitive: boolean;
  excludeFromPublic?: boolean;
  tags: Array<{ id: string; name: string }>;
}

interface UpdatedPostData {
  content: any;
  isSensitive: boolean;
  excludeFromPublic: boolean;
  tags: Array<{ id: string; name: string }>;
}

interface EditorialComposerProps {
  mode: ComposerMode;
  /** Continue an existing thread (create mode). */
  threadId?: string;
  /** Edit mode: the post being edited. */
  existingPost?: ExistingPostData;
  /** Edit mode: editing a reblog's comment rather than the post body. */
  isReblogEdit?: boolean;
  /** Called on a successful create with the new post id. */
  onSuccess?: (postId: string) => void;
  /** Called on a successful edit with the updated post data (in-place updates). */
  onEditSuccess?: (data: UpdatedPostData) => void;
  /** Close handler (navigation back, or hide the in-place edit modal). */
  onClose: () => void;
}

function tagsToNames(tags: Array<{ id: string; name: string }>): string[] {
  return tags.map((t) => t.name);
}

/** Build the initial state for edit mode by hydrating from the existing post. */
function buildEditInitial(
  post: ExistingPostData,
  isReblogEdit: boolean
): Partial<ComposerState> {
  const base: Partial<ComposerState> = {
    postType: (post.postType as PostType) || "text",
    isSensitive: post.isSensitive,
    excludeFromPublic: post.excludeFromPublic ?? false,
    tags: tagsToNames(post.tags),
  };

  if (isReblogEdit) {
    base.postType = "text";
    base.content = {
      html: post.content?.html || "",
      plain: post.content?.plain || "",
    };
    return base;
  }

  if (post.postType === "text") {
    const c = post.content as TextPostContent;
    base.content = { html: c.html || "", plain: c.plain || "" };
  } else {
    const c = post.content as
      | ImagePostContent
      | VideoPostContent
      | AudioPostContent
      | GalleryPostContent;
    const captionHtml = c.caption_html || "";
    base.content = {
      html: captionHtml,
      plain: captionHtml.replace(/<[^>]*>/g, ""),
    };

    // Hydrate the media fields so the editor isn't empty on open (and so edits
    // pass the "upload at least one …" validation on save).
    if (post.postType === "image") {
      const ic = post.content as ImagePostContent;
      base.mediaUrls = ic.urls || [];
      base.altTexts = ic.alt_texts || [];
      base.imageMode = "upload";
    } else if (post.postType === "gallery") {
      // Galleries are stored as { urls, alt_texts } (same shape as image posts),
      // though the legacy type models them as items[]. Prefer urls, fall back to items.
      const gc = post.content as GalleryPostContent & {
        urls?: string[];
        alt_texts?: string[];
      };
      if (gc.urls && gc.urls.length > 0) {
        base.mediaUrls = gc.urls;
        base.altTexts = gc.alt_texts || [];
      } else {
        base.mediaUrls = (gc.items || []).map((it) => it.url);
        base.altTexts = (gc.items || []).map((it) => it.alt_text || "");
      }
      base.imageMode = "upload";
    } else if (post.postType === "video") {
      const vc = post.content as VideoPostContent;
      if (vc.embed_url) {
        base.videoMode = "embed";
        base.videoEmbedUrl = vc.embed_url;
      } else if (vc.url) {
        base.videoMode = "upload";
        base.mediaUrls = [vc.url];
      }
    } else if (post.postType === "audio") {
      const ac = post.content as AudioPostContent;
      if (ac.url) {
        base.audioMode = "upload";
        base.mediaUrls = [ac.url];
      }
      // Spotify-track audio is re-selected on edit (not hydrated here).
    }
  }
  return base;
}

export function EditorialComposer({
  mode,
  threadId,
  existingPost,
  isReblogEdit = false,
  onSuccess,
  onEditSuccess,
  onClose,
}: EditorialComposerProps) {
  const isEdit = mode === "edit";

  // Compute the initial state once (edit hydration or fresh).
  const initialState = useMemo(() => {
    if (isEdit && existingPost) {
      return buildEditInitial(existingPost, isReblogEdit);
    }
    // Deep-linked "add a story to this collection" — open in story mode with the
    // collection pre-selected.
    if (!isEdit && threadId) {
      return {
        isEssay: true,
        collectionMode: "existing",
        collectionThreadId: threadId,
      } as Partial<ComposerState>;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const composer = useComposerState(initialState);
  const { state, patch, setPostType, reset, ensurePostId } = composer;

  const [isPending, startTransition] = useTransition();
  const [showPreview, setShowPreview] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [myCommunities, setMyCommunities] = useState<CommunitySummary[]>([]);
  const [myCollections, setMyCollections] = useState<MyCollection[]>([]);
  const draftHydrated = useRef(false);

  // Link previews (text posts).
  const existingPreviews: LinkPreviewData[] =
    isEdit && existingPost?.postType === "text" && existingPost.content?.link_previews
      ? existingPost.content.link_previews
      : [];
  const {
    previews: linkPreviews,
    isLoading: linkPreviewsLoading,
    dismiss: dismissLinkPreview,
    getPreviewsForSave,
  } = useLinkPreviews({
    text: state.postType === "text" ? state.content.plain : "",
    initialPreviews: existingPreviews,
  });

  // Autosave draft (keyed by post id in edit, "new" in create).
  const draftKey = isEdit && existingPost ? existingPost.id : "new";
  const { status: draftStatus, loadDraft, clearDraft } = useComposerDraft({
    draftKey,
    state,
    enabled: !isEdit, // only autosave fresh posts
  });

  // Generate the upload post id.
  useEffect(() => {
    void ensurePostId();
  }, [ensurePostId]);

  // Restore a saved draft on first mount (create mode only).
  useEffect(() => {
    if (isEdit || draftHydrated.current) return;
    draftHydrated.current = true;
    const saved = loadDraft();
    if (saved) {
      reset({ ...createInitialState(saved), postId: state.postId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load communities + the author's collections (create mode).
  useEffect(() => {
    if (isEdit) return;
    getMyCommunities().then((r) => {
      if (r.success) setMyCommunities(r.communities || []);
    });
    getMyCollections().then((r) => {
      if (r.success) setMyCollections(r.collections || []);
    });
  }, [isEdit]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    // Non-destructive: the draft is preserved in localStorage for create mode.
    onClose();
  };

  const handleSubmit = () => {
    patch({ error: null });
    startTransition(async () => {
      const result = await composer.submit({
        getPreviewsForSave,
        mode,
        editPostId: existingPost?.id,
        isReblogEdit,
        existingContent: existingPost?.content,
        threadId,
      });

      if (result.success) {
        if (isEdit) {
          onEditSuccess?.({
            content: result.updatedContent,
            isSensitive: state.isSensitive,
            // Mirror the server's hard rule so the in-place UI stays consistent.
            excludeFromPublic: state.isSensitive ? true : state.excludeFromPublic,
            tags: state.tags.map((name, idx) => ({ id: `temp-${idx}`, name })),
          });
        } else {
          clearDraft();
          if (result.postId) onSuccess?.(result.postId);
        }
        onClose();
      } else {
        patch({ error: result.error || "Something went wrong" });
      }
    });
  };

  const submitLabel = isEdit
    ? isReblogEdit
      ? "Save Echo"
      : "Save"
    : undefined;

  return (
    <Portal>
      {/* Overlay — feed peeks at the margins */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed inset-2 md:inset-8 z-[60] flex flex-col rounded-3xl border border-[var(--vocl-border)] bg-background shadow-2xl overflow-hidden">
        <ComposerTopBar
          mode={mode}
          postType={state.postType}
          onPostTypeChange={setPostType}
          publishMode={state.publishMode}
          onPublishModeChange={(m) => patch({ publishMode: m })}
          draftStatus={draftStatus}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview((v) => !v)}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isPending={isPending}
          lockType={isEdit}
          submitLabel={submitLabel}
        />

        {/* Thread banner */}
        {threadId && !isEdit && (
          <div className="px-5 py-2 text-sm text-[var(--vocl-primary)] border-b border-[var(--vocl-border)] bg-[color-mix(in_srgb,var(--vocl-primary)_8%,transparent)]">
            Continuing thread…
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          {/* Center manuscript column */}
          <main className="flex-1 overflow-y-auto">
            {showPreview ? (
              <ComposerPreview state={state} linkPreviews={linkPreviews} />
            ) : (
              <ManuscriptColumn
                state={state}
                patch={patch}
                mode={mode}
                linkPreviews={linkPreviews}
                linkPreviewsLoading={linkPreviewsLoading}
                onDismissPreview={dismissLinkPreview}
              />
            )}

            {state.error && (
              <div className="mx-auto max-w-[680px] px-5 pb-8">
                <div className="p-3 rounded-xl bg-vocl-like/15 border border-vocl-like/30 text-vocl-like text-sm">
                  {state.error}
                </div>
              </div>
            )}
          </main>

          {/* Inspector — desktop sidebar */}
          <aside className="hidden lg:block w-[320px] shrink-0 border-l border-[var(--vocl-border)] overflow-y-auto">
            <ComposerInspector
              state={state}
              patch={patch}
              mode={mode}
              myCommunities={myCommunities}
              myCollections={myCollections}
            />
          </aside>
        </div>

        {/* Inspector trigger — mobile/tablet */}
        <button
          type="button"
          onClick={() => setInspectorOpen(true)}
          className="lg:hidden absolute bottom-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-full border border-[var(--vocl-border)] bg-vocl-surface-dark/95 backdrop-blur text-sm font-medium text-foreground shadow-xl"
        >
          <IconAdjustmentsHorizontal size={18} />
          Options
        </button>
      </div>

      {/* Inspector — mobile bottom sheet */}
      {inspectorOpen && (
        <div className="lg:hidden fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setInspectorOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background border-t border-[var(--vocl-border)]">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--vocl-border)] sticky top-0 bg-background">
              <h2 className="font-semibold text-foreground">Post options</h2>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:bg-[var(--vocl-hover)]"
              >
                <IconX size={18} />
              </button>
            </div>
            <ComposerInspector
              state={state}
              patch={patch}
              mode={mode}
              myCommunities={myCommunities}
              myCollections={myCollections}
            />
          </div>
        </div>
      )}
    </Portal>
  );
}

/** Lightweight read-only preview using the editorial type scale. */
function ComposerPreview({
  state,
  linkPreviews,
}: {
  state: ComposerState;
  linkPreviews: LinkPreviewData[];
}) {
  const isText = state.postType === "text";
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 py-10 md:py-12">
      {isText && state.isEssay && state.essayTitle && (
        <h1 className="type-display-lg text-foreground mb-2">{state.essayTitle}</h1>
      )}
      {isText && state.isEssay && state.content.plain && (
        <p className="type-meta text-foreground/45 mb-6">
          {readingTimeMinutes(state.content.plain)} min read
        </p>
      )}

      {/* Media preview */}
      {state.postType === "image" && state.mediaUrls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.mediaUrls[0]}
          alt={state.altTexts[0] || ""}
          className="w-full rounded-2xl mb-6"
        />
      )}
      {state.postType === "image" && state.selectedUnsplash && !state.mediaUrls[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.selectedUnsplash.urls.regular}
          alt={state.altTexts[0] || ""}
          className="w-full rounded-2xl mb-6"
        />
      )}
      {state.postType === "image" && state.imageLinkUrl && !state.mediaUrls[0] && !state.selectedUnsplash && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.imageLinkUrl} alt={state.altTexts[0] || ""} className="w-full rounded-2xl mb-6" />
      )}
      {state.postType === "gif" && state.selectedGifUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.selectedGifUrl} alt={state.altTexts[0] || ""} className="w-full rounded-2xl mb-6" />
      )}
      {state.postType === "video" && state.mediaUrls[0] && (
        <video src={state.mediaUrls[0]} controls className="w-full rounded-2xl mb-6" />
      )}

      {/* Poll preview */}
      {state.postType === "poll" && (
        <div className="mb-6">
          <h2 className="type-heading text-foreground mb-3">
            {state.pollQuestion || "Your poll question"}
          </h2>
          <div className="space-y-2">
            {state.pollOptions
              .filter((o) => o.trim())
              .map((o, i) => (
                <div
                  key={i}
                  className="px-4 py-2.5 rounded-xl border border-[var(--vocl-border)] text-foreground"
                >
                  {o}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Body / caption */}
      {state.content.html && state.postType !== "poll" && (
        <div
          className="editorial-prose type-body-lg text-foreground"
          dangerouslySetInnerHTML={{ __html: state.content.html }}
        />
      )}

      {!state.content.html && state.postType === "text" && (
        <p className="text-foreground/40 italic">Nothing to preview yet.</p>
      )}

      {linkPreviews.length > 0 && isText && (
        <div className="mt-4 space-y-2">
          {linkPreviews.map((p) => (
            <a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl border border-[var(--vocl-border)] hover:bg-[var(--vocl-hover)] transition-colors"
            >
              <span className="block text-sm font-medium text-foreground truncate">
                {p.title || p.url}
              </span>
              {p.description && (
                <span className="block text-xs text-foreground/50 mt-0.5 line-clamp-2">
                  {p.description}
                </span>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
