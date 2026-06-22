"use client";

import { useReducer, useCallback, useMemo } from "react";
import { parseVideoUrl } from "@/lib/video-embeds";
import type { SpotifyTrack } from "@/lib/spotify";
import { readingTimeMinutes } from "@/lib/essay";
import { createPost, updatePost, generatePostId } from "@/actions/posts";
import { crossPostToCommunities } from "@/actions/communities";
import { transcribePostAudio } from "@/actions/transcribe";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  PollPostContent,
  LinkPreviewData,
} from "@/types/database";

export type PostType = "text" | "image" | "video" | "audio" | "poll" | "gif";
export type PublishMode = "now" | "queue" | "schedule";
export type ComposerMode = "create" | "edit";

/**
 * The consolidated composer state. This is a 1:1 extraction of the ~40 state
 * fields that lived in the original CreatePostModal, gathered into a single
 * reducer so it can be persisted (autosave) and reasoned about as one unit.
 */
export interface ComposerState {
  postType: PostType;
  postId: string;
  content: { html: string; plain: string };
  mediaUrls: string[];
  tags: string[];
  selectedCommunityIds: string[];
  isSensitive: boolean;
  /** Author opted this post out of the public (logged-out) front page / web. */
  excludeFromPublic: boolean;
  contentWarning: string;
  publishMode: PublishMode;
  scheduledDate: string;
  scheduledTime: string;

  // Poll
  pollQuestion: string;
  pollOptions: string[];
  pollExpiresAt: string;
  pollShowResultsBeforeVote: boolean;
  pollAllowMultiple: boolean;

  // Image
  imageMode: "upload" | "link" | "unsplash";
  imageLinkUrl: string;
  imageLinkError: string | null;

  // Video
  videoMode: "embed" | "upload";
  videoEmbedUrl: string;
  videoEmbedError: string | null;

  // Audio
  audioMode: "spotify" | "upload" | "record";
  recordedAudioUrl: string | null;
  recordedDuration: number;
  spotifyQuery: string;
  spotifyResults: SpotifyTrack[];
  selectedTrack: SpotifyTrack | null;
  isSearching: boolean;

  // Essay
  isEssay: boolean;
  essayTitle: string;

  // Unsplash
  unsplashQuery: string;
  unsplashResults: any[];
  isSearchingUnsplash: boolean;
  selectedUnsplash: any | null;

  // Alt text
  altTexts: string[];

  // GIF
  selectedGifUrl: string | null;
  gifPickerOpen: boolean;

  // Legal acknowledgment for file uploads
  hasAcknowledgedRights: boolean;

  // UI / runtime
  error: string | null;
}

export function createInitialState(overrides?: Partial<ComposerState>): ComposerState {
  return {
    postType: "text",
    postId: "",
    content: { html: "", plain: "" },
    mediaUrls: [],
    tags: [],
    selectedCommunityIds: [],
    isSensitive: false,
    // Privacy-first default: posts are Members-only unless the author opts into
    // Public via the Audience selector.
    excludeFromPublic: true,
    contentWarning: "",
    publishMode: "now",
    scheduledDate: "",
    scheduledTime: "12:00",
    pollQuestion: "",
    pollOptions: ["", ""],
    pollExpiresAt: "",
    pollShowResultsBeforeVote: false,
    pollAllowMultiple: false,
    imageMode: "upload",
    imageLinkUrl: "",
    imageLinkError: null,
    videoMode: "embed",
    videoEmbedUrl: "",
    videoEmbedError: null,
    audioMode: "spotify",
    recordedAudioUrl: null,
    recordedDuration: 0,
    spotifyQuery: "",
    spotifyResults: [],
    selectedTrack: null,
    isSearching: false,
    isEssay: false,
    essayTitle: "",
    unsplashQuery: "",
    unsplashResults: [],
    isSearchingUnsplash: false,
    selectedUnsplash: null,
    altTexts: [],
    selectedGifUrl: null,
    gifPickerOpen: false,
    hasAcknowledgedRights: false,
    error: null,
    ...overrides,
  };
}

type Action =
  | { type: "PATCH"; payload: Partial<ComposerState> }
  | { type: "SET_POST_TYPE"; payload: PostType }
  | { type: "RESET"; payload?: Partial<ComposerState> };

function reducer(state: ComposerState, action: Action): ComposerState {
  switch (action.type) {
    case "PATCH":
      return { ...state, ...action.payload };
    case "SET_POST_TYPE": {
      const type = action.payload;
      // Mirror the original modal's behavior: switching type clears media + alt
      // text, and toggles the GIF picker.
      return {
        ...state,
        postType: type,
        mediaUrls: [],
        altTexts: [],
        gifPickerOpen: type === "gif",
        selectedGifUrl: type === "gif" ? state.selectedGifUrl : null,
      };
    }
    case "RESET":
      return createInitialState(action.payload);
    default:
      return state;
  }
}

/**
 * Fields that are persisted to / restored from localStorage. We deliberately
 * exclude transient runtime fields (search results, loading flags, errors,
 * the GIF picker open flag) and the postId (re-generated per session).
 */
const PERSISTED_KEYS: (keyof ComposerState)[] = [
  "postType",
  "content",
  "mediaUrls",
  "tags",
  "selectedCommunityIds",
  "isSensitive",
  "excludeFromPublic",
  "contentWarning",
  "publishMode",
  "scheduledDate",
  "scheduledTime",
  "pollQuestion",
  "pollOptions",
  "pollExpiresAt",
  "pollShowResultsBeforeVote",
  "pollAllowMultiple",
  "imageMode",
  "imageLinkUrl",
  "videoMode",
  "videoEmbedUrl",
  "audioMode",
  "recordedAudioUrl",
  "recordedDuration",
  "selectedTrack",
  "isEssay",
  "essayTitle",
  "selectedUnsplash",
  "altTexts",
  "selectedGifUrl",
];

export function serializeForDraft(state: ComposerState): Partial<ComposerState> {
  const out: Partial<ComposerState> = {};
  for (const key of PERSISTED_KEYS) {
    (out as any)[key] = state[key];
  }
  return out;
}

interface SubmitDeps {
  /** Saved link previews for text posts (from useLinkPreviews). */
  getPreviewsForSave: () => LinkPreviewData[];
  /** Edit mode metadata. */
  mode: ComposerMode;
  editPostId?: string;
  isReblogEdit?: boolean;
  /** Original content for media posts in edit mode (to preserve non-caption fields). */
  existingContent?: any;
  threadId?: string;
}

interface SubmitResult {
  success: boolean;
  postId?: string;
  error?: string;
  /** In edit mode, the rebuilt content (for in-place UI updates). */
  updatedContent?: any;
}

export interface UseComposerStateReturn {
  state: ComposerState;
  patch: (payload: Partial<ComposerState>) => void;
  setPostType: (type: PostType) => void;
  reset: (overrides?: Partial<ComposerState>) => void;
  ensurePostId: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  /** Pure validation, returns an error string or null. */
  validate: () => string | null;
  /** Runs validation + the network submit. Mirrors the original handleSubmit. */
  submit: (deps: SubmitDeps) => Promise<SubmitResult>;
}

export function useComposerState(
  initial?: Partial<ComposerState>
): UseComposerStateReturn {
  const [state, dispatch] = useReducer(
    reducer,
    initial,
    createInitialState
  );

  const patch = useCallback((payload: Partial<ComposerState>) => {
    dispatch({ type: "PATCH", payload });
  }, []);

  const setPostType = useCallback((type: PostType) => {
    dispatch({ type: "SET_POST_TYPE", payload: type });
  }, []);

  const reset = useCallback((overrides?: Partial<ComposerState>) => {
    dispatch({ type: "RESET", payload: overrides });
  }, []);

  const ensurePostId = useCallback(async () => {
    if (!state.postId) {
      const id = await generatePostId();
      dispatch({ type: "PATCH", payload: { postId: id } });
    }
  }, [state.postId]);

  const hasUnsavedChanges = useCallback(() => {
    if (state.content.plain?.trim()) return true;
    if (state.content.html?.trim() && state.content.html !== "<p></p>") return true;
    if (state.mediaUrls.length > 0) return true;
    if (state.imageLinkUrl.trim()) return true;
    if (state.selectedTrack) return true;
    if (state.recordedAudioUrl) return true;
    if (state.selectedUnsplash) return true;
    if (state.selectedGifUrl) return true;
    if (state.tags.length > 0) return true;
    if (state.pollOptions.some((o) => o.trim())) return true;
    return false;
  }, [state]);

  // --- Validation (verbatim from the original handleSubmit guards) ---
  const validate = useCallback((): string | null => {
    const {
      postType,
      content,
      videoMode,
      videoEmbedUrl,
      mediaUrls,
      hasAcknowledgedRights,
      audioMode,
      selectedTrack,
      recordedAudioUrl,
      imageMode,
      imageLinkUrl,
      selectedUnsplash,
      selectedGifUrl,
      pollQuestion,
      pollOptions,
      publishMode,
      scheduledDate,
      scheduledTime,
    } = state;

    if (postType === "text" && !content.plain.trim()) {
      return "Please write something";
    }
    if (postType === "video") {
      if (videoMode === "embed") {
        if (!videoEmbedUrl.trim()) return "Please enter a video URL";
        const parsed = parseVideoUrl(videoEmbedUrl);
        if (!parsed) {
          return "Please enter a valid YouTube, Vimeo, Rumble, or Dailymotion URL";
        }
      } else {
        if (mediaUrls.length === 0) return "Please upload a video file";
        if (!hasAcknowledgedRights) {
          return "Please acknowledge that you have the rights to publish this content";
        }
      }
    } else if (postType === "audio") {
      if (audioMode === "spotify") {
        if (!selectedTrack) return "Please search and select a track";
      } else if (audioMode === "record") {
        if (!recordedAudioUrl) return "Record a voice note first";
      } else {
        if (mediaUrls.length === 0) return "Please upload an audio file";
        if (!hasAcknowledgedRights) {
          return "Please acknowledge that you have the rights to publish this content";
        }
      }
    } else if (postType === "image") {
      if (imageMode === "upload" && mediaUrls.length === 0) {
        return "Please upload at least one image";
      }
      if (imageMode === "link" && !imageLinkUrl.trim()) {
        return "Please enter an image URL";
      }
      if (imageMode === "unsplash" && !selectedUnsplash) {
        return "Please search and select a photo from Unsplash";
      }
    }
    if (postType === "gif" && !selectedGifUrl) {
      return "Please select a GIF";
    }
    if (postType === "poll") {
      if (!pollQuestion.trim()) return "Please enter a poll question";
      const filledOptions = pollOptions.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        return "Please provide at least 2 poll options";
      }
    }
    if (publishMode === "schedule") {
      if (!scheduledDate) return "Please select a date";
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        return "Scheduled time must be in the future";
      }
    }
    return null;
  }, [state]);

  // --- Submit (verbatim port of the original handleSubmit body) ---
  const submit = useCallback(
    async (deps: SubmitDeps): Promise<SubmitResult> => {
      const {
        getPreviewsForSave,
        mode,
        editPostId,
        isReblogEdit,
        existingContent,
        threadId,
      } = deps;

      const validationError = validate();
      if (validationError) {
        return { success: false, error: validationError };
      }

      const s = state;

      // ----- EDIT MODE -----
      // Edit preserves the exact shapes/branches the original EditPostModal used:
      // text posts rebuild html/plain (+ link previews); media posts preserve
      // the original content object and only swap caption_html; reblog edits
      // update the reblog comment.
      if (mode === "edit" && editPostId) {
        if (isReblogEdit) {
          const result = await updatePost({
            postId: editPostId,
            reblogComment: s.content.html || null,
            isSensitive: s.isSensitive,
            excludeFromPublic: s.excludeFromPublic,
            tags: s.tags,
          });
          if (result.success) {
            return {
              success: true,
              postId: editPostId,
              updatedContent: { html: s.content.html, plain: s.content.plain },
            };
          }
          return { success: false, error: result.error || "Failed to update post" };
        }

        let updatedContent: any;
        if (s.postType === "text") {
          const savedPreviews = getPreviewsForSave();
          updatedContent = {
            html: s.content.html,
            plain: s.content.plain,
            ...(savedPreviews.length > 0 && { link_previews: savedPreviews }),
          } as TextPostContent;
        } else {
          updatedContent = {
            ...(existingContent || {}),
            caption_html: s.content.html || undefined,
          };
        }

        const result = await updatePost({
          postId: editPostId,
          content: updatedContent,
          isSensitive: s.isSensitive,
          excludeFromPublic: s.excludeFromPublic,
          tags: s.tags,
        });
        if (result.success) {
          return { success: true, postId: editPostId, updatedContent };
        }
        return { success: false, error: result.error || "Failed to update post" };
      }

      // ----- CREATE MODE -----
      let postContent:
        | TextPostContent
        | ImagePostContent
        | VideoPostContent
        | AudioPostContent
        | PollPostContent;
      let actualPostType:
        | "text"
        | "image"
        | "video"
        | "audio"
        | "gallery"
        | "poll" = s.postType === "gif" ? "image" : s.postType;

      switch (s.postType) {
        case "text": {
          const savedPreviews = getPreviewsForSave();
          postContent = {
            html: s.content.html,
            plain: s.content.plain,
            ...(savedPreviews.length > 0 && { link_previews: savedPreviews }),
            ...(s.isEssay && {
              is_essay: true,
              essay_title: s.essayTitle.trim() || undefined,
              reading_time_minutes: readingTimeMinutes(s.content.plain),
            }),
          } as TextPostContent;
          break;
        }

        case "image": {
          let imageUrls: string[];

          if (s.imageMode === "link") {
            const rehostRes = await fetch("/api/upload/from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: s.imageLinkUrl.trim(),
                postId: s.postId,
              }),
            });

            if (!rehostRes.ok) {
              const data = await rehostRes.json();
              return { success: false, error: data.error || "Failed to download image" };
            }

            const { publicUrl } = await rehostRes.json();
            imageUrls = [publicUrl];
          } else if (s.imageMode === "unsplash" && s.selectedUnsplash) {
            imageUrls = [s.selectedUnsplash.urls.regular];
          } else {
            imageUrls = s.mediaUrls;
          }

          postContent = {
            urls: imageUrls,
            alt_texts: imageUrls.map((_, i) => s.altTexts[i] || ""),
            caption_html: s.content.html || undefined,
          } as ImagePostContent;

          if (s.imageMode === "unsplash" && s.selectedUnsplash) {
            (postContent as any).unsplash_attribution = {
              photographer: s.selectedUnsplash.user.name,
              photographer_username: s.selectedUnsplash.user.username,
              profile_url: `${s.selectedUnsplash.user.links.html}?utm_source=bevocl&utm_medium=referral`,
              photo_id: s.selectedUnsplash.id,
            };
          }
          if (imageUrls.length > 1) {
            actualPostType = "gallery";
          }
          break;
        }

        case "gif": {
          actualPostType = "image";
          postContent = {
            urls: [s.selectedGifUrl!],
            alt_texts: [s.altTexts[0] || ""],
            caption_html: s.content.html || undefined,
          } as ImagePostContent;
          break;
        }

        case "video":
          if (s.videoMode === "embed") {
            const parsed = parseVideoUrl(s.videoEmbedUrl);
            if (parsed) {
              postContent = {
                embed_url: parsed.embedUrl,
                embed_platform: parsed.platform,
                embed_video_id: parsed.videoId,
                thumbnail_url: parsed.thumbnailUrl,
                caption_html: s.content.html || undefined,
              } as VideoPostContent;
            } else {
              return { success: false, error: "Invalid video URL" };
            }
          } else {
            postContent = {
              url: s.mediaUrls[0],
              caption_html: s.content.html || undefined,
            } as VideoPostContent;
          }
          break;

        case "audio":
          if (s.audioMode === "spotify" && s.selectedTrack) {
            postContent = {
              spotify_data: {
                track_id: s.selectedTrack.id,
                name: s.selectedTrack.name,
                artist: s.selectedTrack.artist,
                album: s.selectedTrack.album,
                album_art: s.selectedTrack.albumArt || undefined,
                external_url: s.selectedTrack.externalUrl,
              },
              album_art_url: s.selectedTrack.albumArt || undefined,
              caption_html: s.content.html || undefined,
            } as AudioPostContent;
          } else if (s.audioMode === "record" && s.recordedAudioUrl) {
            postContent = {
              url: s.recordedAudioUrl,
              duration: s.recordedDuration,
              is_voice_note: true,
              caption_html: s.content.html || undefined,
            } as AudioPostContent;
          } else {
            postContent = {
              url: s.mediaUrls[0],
              caption_html: s.content.html || undefined,
            } as AudioPostContent;
          }
          break;

        case "poll":
          postContent = {
            question: s.pollQuestion.trim(),
            options: s.pollOptions.filter((opt) => opt.trim()),
            expires_at: s.pollExpiresAt || undefined,
            show_results_before_vote: s.pollShowResultsBeforeVote,
            allow_multiple: s.pollAllowMultiple,
          } as PollPostContent;
          break;

        default:
          return { success: false, error: "Unsupported post type" };
      }

      if (s.contentWarning.trim()) {
        (postContent as any).content_warning = s.contentWarning.trim();
      }

      const result = await createPost({
        postType: actualPostType,
        content: postContent,
        isSensitive: s.isSensitive,
        excludeFromPublic: s.excludeFromPublic,
        tags: s.tags,
        publishMode: s.publishMode,
        scheduledFor:
          s.publishMode === "schedule"
            ? new Date(`${s.scheduledDate}T${s.scheduledTime}`).toISOString()
            : undefined,
        threadId: threadId || undefined,
        pendingCommunityIds:
          s.selectedCommunityIds.length > 0 && s.publishMode !== "now"
            ? s.selectedCommunityIds
            : undefined,
      });

      if (result.success && result.postId) {
        if (s.selectedCommunityIds.length > 0 && s.publishMode === "now") {
          await crossPostToCommunities(result.postId, s.selectedCommunityIds);
        }
        if (
          actualPostType === "audio" &&
          s.audioMode === "record" &&
          s.recordedAudioUrl &&
          s.publishMode === "now"
        ) {
          void transcribePostAudio(result.postId);
        }
        return { success: true, postId: result.postId, error: result.error };
      }

      return { success: false, error: result.error || "Failed to create post" };
    },
    [state, validate]
  );

  return useMemo(
    () => ({
      state,
      patch,
      setPostType,
      reset,
      ensurePostId,
      hasUnsavedChanges,
      validate,
      submit,
    }),
    [state, patch, setPostType, reset, ensurePostId, hasUnsavedChanges, validate, submit]
  );
}
