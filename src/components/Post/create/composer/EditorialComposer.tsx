"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { IconAdjustmentsHorizontal, IconX } from "@tabler/icons-react";
import { Portal } from "@/components/ui";
import { useLinkPreviews } from "@/hooks/useLinkPreviews";
import { getMyCommunities, type CommunitySummary } from "@/actions/communities";
import { getMyCollections, type MyCollection } from "@/actions/post-threads";
import { getPostAudience } from "@/actions/posts";
import { readingTimeMinutes } from "@/lib/essay";
import { isDeploymentSkew } from "@/lib/deploymentSkew";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  GalleryPostContent,
  PollPostContent,
  LinkPreviewData,
  PostAudience,
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
import { ComposerTypeBar } from "./ComposerTypeBar";
import { ManuscriptColumn } from "./ManuscriptColumn";
import { ComposerInspector } from "./ComposerInspector";

export interface ExistingPostData {
  id: string;
  postType: string;
  content: any;
  isSensitive: boolean;
  excludeFromPublic?: boolean;
  audience?: PostAudience;
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
  // The composer has no separate "gallery" type — galleries edit through the
  // image "upload" mode and are re-derived to a gallery on save (>1 image).
  const editType: PostType =
    post.postType === "gallery" ? "image" : ((post.postType as PostType) || "text");
  const base: Partial<ComposerState> = {
    postType: editType,
    isSensitive: post.isSensitive,
    audience: post.audience ?? (post.excludeFromPublic ? "members" : "public"),
    tags: tagsToNames(post.tags),
  };

  // Preserve the content warning (stored inside the content JSON) on edit.
  const cw = (post.content as { content_warning?: string } | null)?.content_warning;
  if (cw) base.contentWarning = cw;

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
  } else if (post.postType === "poll") {
    const pc = post.content as PollPostContent;
    base.pollQuestion = pc.question || "";
    const opts = Array.isArray(pc.options)
      ? pc.options.map((o) =>
          typeof o === "string" ? o : String((o as { text?: string })?.text ?? ""),
        )
      : [];
    base.pollOptions =
      opts.length >= 2 ? opts : [...opts, ...Array(Math.max(0, 2 - opts.length)).fill("")];
    base.pollExpiresAt = pc.expires_at || "";
    base.pollShowResultsBeforeVote = pc.show_results_before_vote ?? false;
    base.pollAllowMultiple = pc.allow_multiple ?? false;
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
      if (ac.spotify_data) {
        base.audioMode = "spotify";
        base.selectedTrack = {
          id: ac.spotify_data.track_id,
          name: ac.spotify_data.name,
          artist: ac.spotify_data.artist,
          album: ac.spotify_data.album,
          albumArt: ac.spotify_data.album_art ?? ac.album_art_url ?? null,
          previewUrl: null,
          duration: 0,
          externalUrl: ac.spotify_data.external_url ?? "",
        };
      } else if (ac.url) {
        base.audioMode = "upload";
        base.mediaUrls = [ac.url];
      }
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // Holds the latest Escape behavior; the keydown listener is bound once but
  // must always run against current state (see below).
  const escapeRef = useRef<() => void>(() => {});
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

  // On edit-open, fetch the post's true audience tier. The render DTOs only
  // carry the exclude_from_public boolean, so a followers-only post would
  // otherwise seed as Members and silently widen its audience on save.
  useEffect(() => {
    if (isEdit && existingPost?.id && existingPost.audience === undefined) {
      getPostAudience(existingPost.id).then((aud) => {
        if (aud) patch({ audience: aud });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existingPost?.id]);

  // Restore a saved draft on first mount (create mode only).
  useEffect(() => {
    if (isEdit || draftHydrated.current) return;
    draftHydrated.current = true;
    const saved = loadDraft();
    if (saved) {
      // Keep a non-empty postId across the restore. `state.postId` is captured
      // from the initial render (still ""), and this RESET replaces state — so
      // without the fallback the id ensurePostId() just generated gets clobbered
      // back to "", and every postId-gated upload box stops rendering.
      reset({ ...createInitialState(saved), postId: state.postId || crypto.randomUUID() });
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
      if (e.key === "Escape") escapeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    // Create mode with something typed/attached: confirm before leaving so the
    // draft isn't silently kept (and then surprising the author next time).
    if (!isEdit && composer.hasUnsavedChanges()) {
      setShowDiscardConfirm(true);
      return;
    }
    onClose();
  };

  const confirmDiscard = () => {
    clearDraft();
    setShowDiscardConfirm(false);
    onClose();
  };

  // Escape dismisses the discard prompt if it's open; otherwise it goes through
  // the same guard as the X button. Reassigned every render so the once-bound
  // keydown listener always sees current state.
  escapeRef.current = () => {
    if (showDiscardConfirm) {
      setShowDiscardConfirm(false);
      return;
    }
    handleClose();
  };

  const [skewBlocked, setSkewBlocked] = useState(false);

  const handleSubmit = () => {
    patch({ error: null });
    setSkewBlocked(false);
    startTransition(async () => {
      let result;
      try {
        result = await composer.submit({
          getPreviewsForSave,
          mode,
          editPostId: existingPost?.id,
          isReblogEdit,
          existingContent: existingPost?.content,
          threadId,
        });
      } catch (err) {
        // A new deployment invalidated this tab's Server Action IDs. Don't let it
        // crash to the global boundary (which unmounts the composer and drops the
        // draft) — surface an inline reload prompt instead.
        if (isDeploymentSkew(err)) {
          setSkewBlocked(true);
          return;
        }
        throw err;
      }

      if (result.success) {
        if (isEdit) {
          onEditSuccess?.({
            content: result.updatedContent,
            isSensitive: state.isSensitive,
            // Mirror the server's hard rule so the in-place UI stays consistent:
            // anything but Public is excluded from the logged-out web.
            excludeFromPublic: state.isSensitive || state.audience !== "public",
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
        {skewBlocked && (
          <div className="flex items-center justify-between gap-3 border-b border-vocl-border bg-vocl-primary/10 px-4 py-3">
            <span className="type-body text-sm text-foreground/80">
              A new version of be.vocl was released. Reload to{" "}
              {isEdit ? "continue" : "publish"}.
              {!isEdit && " Your draft is saved."}
            </span>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="shrink-0 rounded-lg bg-vocl-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-vocl-primary-hover"
            >
              Reload
            </button>
          </div>
        )}
        <ComposerTopBar
          mode={mode}
          publishMode={state.publishMode}
          onPublishModeChange={(m) => patch({ publishMode: m })}
          draftStatus={draftStatus}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview((v) => !v)}
          onClose={handleClose}
          onSubmit={handleSubmit}
          isPending={isPending}
          submitLabel={submitLabel}
        />

        {/* Prominent post-type selector (create only; edit locks the type). */}
        {!isEdit && (
          <ComposerTypeBar
            postType={state.postType}
            onPostTypeChange={setPostType}
          />
        )}

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

      {/* Discard confirmation — sits above the composer panel (z-[60]) and the
          mobile inspector (z-[70]). */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowDiscardConfirm(false)}
          />
          <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-vocl-surface-dark border border-[var(--vocl-border)] shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-foreground">Discard this post?</h2>
            <p className="mt-2 text-sm text-foreground/60">
              Your draft won&apos;t be saved.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/70 hover:bg-[var(--vocl-hover)]"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmDiscard}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-vocl-like"
              >
                Discard
              </button>
            </div>
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
