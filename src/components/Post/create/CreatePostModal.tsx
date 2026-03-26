"use client";

import { useState, useTransition, useEffect } from "react";
import {
  IconX,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileText,
  IconLoader2,
  IconAlertTriangle,
  IconSend,
  IconClock,
  IconCalendar,
  IconChevronDown,
  IconChartBar,
  IconPlus,
  IconTrash,
  IconLink,
  IconUpload,
  IconCheck,
  IconBrandSpotify,
  IconSearch,
  IconCamera,
  IconGif,
  IconMessagePlus,
} from "@tabler/icons-react";
import Image from "next/image";
import { parseVideoUrl, SUPPORTED_VIDEO_PLATFORMS } from "@/lib/video-embeds";
import type { SpotifyTrack } from "@/lib/spotify";
import { RichTextEditor } from "./RichTextEditor";
import { MediaUploader } from "./MediaUploader";
import { TagInput } from "./TagInput";
import { GifPicker } from "@/components/chat/GifPicker";
import { LinkPreviewCarousel } from "@/components/Post/content/LinkPreviewCarousel";
import { useLinkPreviews } from "@/hooks/useLinkPreviews";
import { createPost, generatePostId } from "@/actions/posts";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  PollPostContent,
} from "@/types/database";

type PostType = "text" | "image" | "video" | "audio" | "poll" | "gif";
type PublishMode = "now" | "queue" | "schedule";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (postId: string) => void;
  threadId?: string;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
  threadId,
}: CreatePostModalProps) {
  const [isPending, startTransition] = useTransition();
  const [postType, setPostType] = useState<PostType>("text");
  const [postId, setPostId] = useState<string>("");
  const [content, setContent] = useState({ html: "", plain: "" });
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSensitive, setIsSensitive] = useState(false);
  const [contentWarning, setContentWarning] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("now");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("12:00");
  const [showPublishOptions, setShowPublishOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll-specific state
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollExpiresAt, setPollExpiresAt] = useState<string>("");
  const [pollShowResultsBeforeVote, setPollShowResultsBeforeVote] =
    useState(false);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);

  // Image-specific state
  const [imageMode, setImageMode] = useState<"upload" | "link" | "unsplash">("upload");
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [imageLinkError, setImageLinkError] = useState<string | null>(null);

  // Video-specific state
  const [videoMode, setVideoMode] = useState<"embed" | "upload">("embed");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState("");
  const [videoEmbedError, setVideoEmbedError] = useState<string | null>(null);

  // Audio-specific state
  const [audioMode, setAudioMode] = useState<"spotify" | "upload">("spotify");
  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<SpotifyTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<SpotifyTrack | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Unsplash-specific state
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState<any[]>([]);
  const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false);
  const [selectedUnsplash, setSelectedUnsplash] = useState<any | null>(null);

  // Alt text state (synced with image count)
  const [altTexts, setAltTexts] = useState<string[]>([]);

  // GIF-specific state
  const [selectedGifUrl, setSelectedGifUrl] = useState<string | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  // Legal acknowledgment for file uploads
  const [hasAcknowledgedRights, setHasAcknowledgedRights] = useState(false);

  // Link previews for text posts
  const {
    previews: linkPreviews,
    isLoading: linkPreviewsLoading,
    dismiss: dismissLinkPreview,
    getPreviewsForSave,
  } = useLinkPreviews({
    text: postType === "text" ? content.plain : "",
  });

  // Generate post ID for uploads
  useEffect(() => {
    if (isOpen && !postId) {
      generatePostId().then(setPostId);
    }
  }, [isOpen, postId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPostType("text");
      setPostId("");
      setContent({ html: "", plain: "" });
      setMediaUrls([]);
      setTags([]);
      setIsSensitive(false);
      setContentWarning("");
      setPublishMode("now");
      setScheduledDate("");
      setScheduledTime("12:00");
      setShowPublishOptions(false);
      setError(null);
      // Reset poll state
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollExpiresAt("");
      setPollShowResultsBeforeVote(false);
      setPollAllowMultiple(false);
      // Reset image state
      setImageMode("upload");
      setImageLinkUrl("");
      setImageLinkError(null);
      // Reset unsplash state
      setUnsplashQuery("");
      setUnsplashResults([]);
      setIsSearchingUnsplash(false);
      setSelectedUnsplash(null);
      // Reset video state
      setVideoMode("embed");
      setVideoEmbedUrl("");
      setVideoEmbedError(null);
      // Reset audio state
      setAudioMode("spotify");
      setSpotifyQuery("");
      setSpotifyResults([]);
      setSelectedTrack(null);
      setIsSearching(false);
      // Reset GIF state
      setSelectedGifUrl(null);
      setGifPickerOpen(false);
      // Reset alt text state
      setAltTexts([]);
      // Reset legal acknowledgment
      setHasAcknowledgedRights(false);
    }
  }, [isOpen]);

  // Set default scheduled date to tomorrow
  useEffect(() => {
    if (publishMode === "schedule" && !scheduledDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
    }
  }, [publishMode, scheduledDate]);

  // Debounced Spotify search
  useEffect(() => {
    if (!spotifyQuery.trim() || spotifyQuery.length < 2) {
      setSpotifyResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/spotify/search?q=${encodeURIComponent(spotifyQuery)}`);
        const data = await res.json();
        setSpotifyResults(data.tracks || []);
      } catch {
        setSpotifyResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [spotifyQuery]);

  // Debounced Unsplash search
  useEffect(() => {
    if (!unsplashQuery.trim() || unsplashQuery.length < 2) {
      setUnsplashResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingUnsplash(true);
      try {
        const res = await fetch(`/api/unsplash/search?q=${encodeURIComponent(unsplashQuery)}`);
        const data = await res.json();
        setUnsplashResults(data.results || []);
      } catch {
        setUnsplashResults([]);
      } finally {
        setIsSearchingUnsplash(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [unsplashQuery]);

  const handleSubmit = async () => {
    setError(null);

    // Validate based on post type
    if (postType === "text" && !content.plain.trim()) {
      setError("Please write something");
      return;
    }
    // Validate media posts
    if (postType === "video") {
      if (videoMode === "embed") {
        if (!videoEmbedUrl.trim()) {
          setError("Please enter a video URL");
          return;
        }
        const parsed = parseVideoUrl(videoEmbedUrl);
        if (!parsed) {
          setError("Please enter a valid YouTube, Vimeo, Rumble, or Dailymotion URL");
          return;
        }
      } else {
        // Upload mode
        if (mediaUrls.length === 0) {
          setError("Please upload a video file");
          return;
        }
        if (!hasAcknowledgedRights) {
          setError("Please acknowledge that you have the rights to publish this content");
          return;
        }
      }
    } else if (postType === "audio") {
      if (audioMode === "spotify") {
        if (!selectedTrack) {
          setError("Please search and select a track");
          return;
        }
      } else {
        if (mediaUrls.length === 0) {
          setError("Please upload an audio file");
          return;
        }
        if (!hasAcknowledgedRights) {
          setError("Please acknowledge that you have the rights to publish this content");
          return;
        }
      }
    } else if (postType === "image") {
      if (imageMode === "upload" && mediaUrls.length === 0) {
        setError("Please upload at least one image");
        return;
      }
      if (imageMode === "link" && !imageLinkUrl.trim()) {
        setError("Please enter an image URL");
        return;
      }
      if (imageMode === "unsplash" && !selectedUnsplash) {
        setError("Please search and select a photo from Unsplash");
        return;
      }
    }
    if (postType === "gif" && !selectedGifUrl) {
      setError("Please select a GIF");
      return;
    }
    if (postType === "poll") {
      if (!pollQuestion.trim()) {
        setError("Please enter a poll question");
        return;
      }
      const filledOptions = pollOptions.filter((opt) => opt.trim());
      if (filledOptions.length < 2) {
        setError("Please provide at least 2 poll options");
        return;
      }
    }

    // Validate schedule
    if (publishMode === "schedule") {
      if (!scheduledDate) {
        setError("Please select a date");
        return;
      }
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (scheduledDateTime <= new Date()) {
        setError("Scheduled time must be in the future");
        return;
      }
    }

    startTransition(async () => {
      // Build content based on post type
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
        | "poll" = postType === "gif" ? "image" : postType;

      switch (postType) {
        case "text": {
          const savedPreviews = getPreviewsForSave();
          postContent = {
            html: content.html,
            plain: content.plain,
            ...(savedPreviews.length > 0 && { link_previews: savedPreviews }),
          } as TextPostContent;
          break;
        }

        case "image": {
          let imageUrls: string[];

          if (imageMode === "link") {
            // Download external image and re-host on R2
            const rehostRes = await fetch("/api/upload/from-url", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: imageLinkUrl.trim(),
                postId,
              }),
            });

            if (!rehostRes.ok) {
              const data = await rehostRes.json();
              setError(data.error || "Failed to download image");
              return;
            }

            const { publicUrl } = await rehostRes.json();
            imageUrls = [publicUrl];
          } else if (imageMode === "unsplash" && selectedUnsplash) {
            // Unsplash: hotlink directly (required by Unsplash API guidelines)
            imageUrls = [selectedUnsplash.urls.regular];
          } else {
            imageUrls = mediaUrls;
          }

          postContent = {
            urls: imageUrls,
            alt_texts: imageUrls.map((_, i) => altTexts[i] || ""),
            caption_html: content.html || undefined,
          } as ImagePostContent;

          // Store Unsplash attribution data
          if (imageMode === "unsplash" && selectedUnsplash) {
            (postContent as any).unsplash_attribution = {
              photographer: selectedUnsplash.user.name,
              photographer_username: selectedUnsplash.user.username,
              profile_url: `${selectedUnsplash.user.links.html}?utm_source=bevocl&utm_medium=referral`,
              photo_id: selectedUnsplash.id,
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
            urls: [selectedGifUrl!],
            alt_texts: [altTexts[0] || ""],
            caption_html: content.html || undefined,
          } as ImagePostContent;
          break;
        }

        case "video":
          if (videoMode === "embed") {
            const parsed = parseVideoUrl(videoEmbedUrl);
            if (parsed) {
              postContent = {
                embed_url: parsed.embedUrl,
                embed_platform: parsed.platform,
                embed_video_id: parsed.videoId,
                thumbnail_url: parsed.thumbnailUrl,
                caption_html: content.html || undefined,
              } as VideoPostContent;
            } else {
              setError("Invalid video URL");
              return;
            }
          } else {
            postContent = {
              url: mediaUrls[0],
              caption_html: content.html || undefined,
            } as VideoPostContent;
          }
          break;

        case "audio":
          if (audioMode === "spotify" && selectedTrack) {
            postContent = {
              spotify_data: {
                track_id: selectedTrack.id,
                name: selectedTrack.name,
                artist: selectedTrack.artist,
                album: selectedTrack.album,
                album_art: selectedTrack.albumArt || undefined,
                external_url: selectedTrack.externalUrl,
              },
              album_art_url: selectedTrack.albumArt || undefined,
              caption_html: content.html || undefined,
            } as AudioPostContent;
          } else {
            postContent = {
              url: mediaUrls[0],
              caption_html: content.html || undefined,
            } as AudioPostContent;
          }
          break;

        case "poll":
          postContent = {
            question: pollQuestion.trim(),
            options: pollOptions.filter((opt) => opt.trim()),
            expires_at: pollExpiresAt || undefined,
            show_results_before_vote: pollShowResultsBeforeVote,
            allow_multiple: pollAllowMultiple,
          } as PollPostContent;
          break;
      }

      // Add content warning to post content if provided
      if (contentWarning.trim()) {
        (postContent as any).content_warning = contentWarning.trim();
      }

      const result = await createPost({
        postType: actualPostType,
        content: postContent,
        isSensitive,
        tags,
        publishMode,
        scheduledFor:
          publishMode === "schedule"
            ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
            : undefined,
        threadId: threadId || undefined,
      });

      if (result.success && result.postId) {
        onSuccess?.(result.postId);
        onClose();
      } else {
        setError(result.error || "Failed to create post");
      }
    });
  };

  const hasUnsavedChanges = () => {
    if (content.plain?.trim()) return true;
    if (content.html?.trim() && content.html !== "<p></p>") return true;
    if (mediaUrls.length > 0) return true;
    if (imageLinkUrl.trim()) return true;
    if (selectedTrack) return true;
    if (selectedUnsplash) return true;
    if (selectedGifUrl) return true;
    if (tags.length > 0) return true;
    if (pollOptions.some(o => o.trim())) return true;
    return false;
  };

  const handleClose = () => {
    if (hasUnsavedChanges()) {
      if (window.confirm("You have unsaved changes. Are you sure you want to close?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const postTypes = [
    { type: "text" as const, icon: IconFileText, label: "Text" },
    { type: "image" as const, icon: IconPhoto, label: "Image" },
    { type: "video" as const, icon: IconVideo, label: "Video" },
    { type: "audio" as const, icon: IconMusic, label: "Audio" },
    { type: "gif" as const, icon: IconGif, label: "GIF" },
    { type: "poll" as const, icon: IconChartBar, label: "Poll" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={handleClose} />

      {/* Modal */}
      <div className="fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-vocl-surface-dark rounded-none md:rounded-3xl z-50 flex flex-col h-full md:h-auto md:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <h2 className="font-semibold text-foreground text-lg">Create Post</h2>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {/* Thread continuation banner */}
          {threadId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-vocl-accent/10 border border-vocl-accent/20 text-vocl-accent text-sm">
              <IconMessagePlus size={16} />
              <span>Continuing thread...</span>
            </div>
          )}

          {/* Post Type Selector */}
          <div className="flex rounded-2xl bg-background/50 p-1">
            {postTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPostType(type);
                  setMediaUrls([]);
                  setAltTexts([]);
                  if (type === "gif") {
                    setGifPickerOpen(true);
                  } else {
                    setGifPickerOpen(false);
                    setSelectedGifUrl(null);
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                  postType === type
                    ? "bg-vocl-accent text-white"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Video Post Options */}
          {postType === "video" && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="flex rounded-xl bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setVideoMode("embed");
                    setMediaUrls([]);
                    setHasAcknowledgedRights(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    videoMode === "embed"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconLink size={16} />
                  Embed URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoMode("upload");
                    setVideoEmbedUrl("");
                    setVideoEmbedError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    videoMode === "upload"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconUpload size={16} />
                  Upload File
                </button>
              </div>

              {/* Embed URL Input */}
              {videoMode === "embed" && (
                <div className="space-y-3">
                  <div>
                    <input
                      type="url"
                      value={videoEmbedUrl}
                      onChange={(e) => {
                        setVideoEmbedUrl(e.target.value);
                        setVideoEmbedError(null);
                        // Live validation
                        if (e.target.value.trim()) {
                          const parsed = parseVideoUrl(e.target.value);
                          if (!parsed) {
                            setVideoEmbedError("URL not recognized. Supported: YouTube, Vimeo, Rumble, Dailymotion");
                          }
                        }
                      }}
                      placeholder="Paste video URL (YouTube, Vimeo, Rumble, Dailymotion)"
                      className={`w-full py-3 px-4 rounded-xl bg-background/50 border text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors ${
                        videoEmbedError
                          ? "border-vocl-like focus:border-vocl-like"
                          : videoEmbedUrl && parseVideoUrl(videoEmbedUrl)
                            ? "border-green-500 focus:border-green-500"
                            : "border-white/10 focus:border-vocl-accent"
                      }`}
                    />
                    {videoEmbedError && (
                      <p className="mt-2 text-xs text-vocl-like">{videoEmbedError}</p>
                    )}
                    {videoEmbedUrl && parseVideoUrl(videoEmbedUrl) && (
                      <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
                        <IconCheck size={14} />
                        {parseVideoUrl(videoEmbedUrl)?.platform.charAt(0).toUpperCase()}
                        {parseVideoUrl(videoEmbedUrl)?.platform.slice(1)} video detected
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-foreground/40">
                    <p className="font-medium mb-1">Supported platforms:</p>
                    <ul className="space-y-0.5">
                      {SUPPORTED_VIDEO_PLATFORMS.map((platform) => (
                        <li key={platform.id}>
                          {platform.name} ({platform.domain})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {videoMode === "upload" && postId && (
                <div className="space-y-3">
                  <MediaUploader
                    postId={postId}
                    mediaType="video"
                    onUploadComplete={setMediaUrls}
                    maxFiles={1}
                    existingUrls={mediaUrls}
                  />

                  {/* Legal Disclaimer */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAcknowledgedRights}
                      onChange={(e) => setHasAcknowledgedRights(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-white/20 bg-background/50 text-vocl-accent focus:ring-vocl-accent focus:ring-offset-0"
                    />
                    <div className="flex-1 text-xs text-foreground/70">
                      <span className="font-medium text-amber-500">Rights Acknowledgment:</span>{" "}
                      By uploading this file, I confirm that I own or have obtained the necessary rights,
                      licenses, or permissions to publish this content. I understand that uploading
                      copyrighted material without authorization may result in content removal and
                      account action.
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Audio Post Options */}
          {postType === "audio" && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="flex rounded-xl bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setAudioMode("spotify");
                    setMediaUrls([]);
                    setHasAcknowledgedRights(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    audioMode === "spotify"
                      ? "bg-[#1DB954] text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconBrandSpotify size={16} />
                  Spotify
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAudioMode("upload");
                    setSelectedTrack(null);
                    setSpotifyQuery("");
                    setSpotifyResults([]);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    audioMode === "upload"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconUpload size={16} />
                  Upload File
                </button>
              </div>

              {/* Spotify Search */}
              {audioMode === "spotify" && (
                <div className="space-y-3">
                  {!selectedTrack ? (
                    <>
                      {/* Search Input */}
                      <div className="relative">
                        <IconSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40" />
                        <input
                          type="text"
                          value={spotifyQuery}
                          onChange={(e) => setSpotifyQuery(e.target.value)}
                          placeholder="Search for a song..."
                          className="w-full py-3 pl-10 pr-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-[#1DB954] transition-colors"
                        />
                        {isSearching && (
                          <IconLoader2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/40 animate-spin" />
                        )}
                      </div>

                      {/* Search Results */}
                      {spotifyResults.length > 0 && (
                        <div className="rounded-xl border border-white/10 overflow-hidden divide-y divide-white/5">
                          {spotifyResults.map((track) => (
                            <button
                              key={track.id}
                              type="button"
                              onClick={() => {
                                setSelectedTrack(track);
                                setSpotifyQuery("");
                                setSpotifyResults([]);
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
                            >
                              {/* Album Art Thumbnail */}
                              <div className="relative w-10 h-10 rounded-md overflow-hidden bg-vocl-surface-dark flex-shrink-0">
                                {track.albumArt ? (
                                  <Image
                                    src={track.albumArt}
                                    alt={track.album}
                                    fill
                                    className="object-cover"
                                    sizes="40px"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <IconMusic size={16} className="text-foreground/20" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{track.name}</p>
                                <p className="text-xs text-foreground/50 truncate">{track.artist} &middot; {track.album}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Empty state */}
                      {spotifyQuery.length >= 2 && !isSearching && spotifyResults.length === 0 && (
                        <p className="text-center text-sm text-foreground/40 py-4">No results found</p>
                      )}
                    </>
                  ) : (
                    /* Selected Track Card */
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-[#1DB954]/30">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-vocl-surface-dark flex-shrink-0">
                        {selectedTrack.albumArt ? (
                          <Image
                            src={selectedTrack.albumArt}
                            alt={selectedTrack.album}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <IconMusic size={20} className="text-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{selectedTrack.name}</p>
                        <p className="text-xs text-foreground/50 truncate">{selectedTrack.artist}</p>
                        <p className="text-xs text-foreground/30 truncate">{selectedTrack.album}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedTrack(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/40 hover:text-foreground hover:bg-white/10 transition-colors flex-shrink-0"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* File Upload */}
              {audioMode === "upload" && postId && (
                <div className="space-y-3">
                  <MediaUploader
                    postId={postId}
                    mediaType="audio"
                    onUploadComplete={setMediaUrls}
                    maxFiles={1}
                    existingUrls={mediaUrls}
                  />

                  {/* Legal Disclaimer */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAcknowledgedRights}
                      onChange={(e) => setHasAcknowledgedRights(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-white/20 bg-background/50 text-vocl-accent focus:ring-vocl-accent focus:ring-offset-0"
                    />
                    <div className="flex-1 text-xs text-foreground/70">
                      <span className="font-medium text-amber-500">Rights Acknowledgment:</span>{" "}
                      By uploading this file, I confirm that I own or have obtained the necessary rights,
                      licenses, or permissions to publish this content. I understand that uploading
                      copyrighted material without authorization may result in content removal and
                      account action.
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Image Options */}
          {postType === "image" && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="flex rounded-xl bg-background/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("upload");
                    setImageLinkUrl("");
                    setImageLinkError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    imageMode === "upload"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconUpload size={16} />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("link");
                    setMediaUrls([]);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    imageMode === "link"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconLink size={16} />
                  Insert by Link
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImageMode("unsplash");
                    setMediaUrls([]);
                    setImageLinkUrl("");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    imageMode === "unsplash"
                      ? "bg-vocl-accent text-white"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <IconCamera size={16} />
                  Unsplash
                </button>
              </div>

              {/* File Upload */}
              {imageMode === "upload" && postId && (
                <MediaUploader
                  postId={postId}
                  mediaType="image"
                  onUploadComplete={(urls) => {
                    setMediaUrls(urls);
                    setAltTexts((prev) => {
                      const next = [...prev];
                      while (next.length < urls.length) next.push("");
                      return next.slice(0, urls.length);
                    });
                  }}
                  maxFiles={10}
                  existingUrls={mediaUrls}
                />
              )}

              {/* Alt text inputs for uploaded images */}
              {imageMode === "upload" && mediaUrls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-foreground/40">Alt text helps people using screen readers</p>
                  {mediaUrls.map((url, index) => (
                    <div key={url} className="flex items-start gap-2">
                      <div className="relative w-10 h-10 rounded-md overflow-hidden bg-black/20 flex-shrink-0">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={altTexts[index] || ""}
                          onChange={(e) => {
                            const next = [...altTexts];
                            while (next.length <= index) next.push("");
                            next[index] = e.target.value.slice(0, 500);
                            setAltTexts(next);
                          }}
                          placeholder="Describe this image (alt text)"
                          maxLength={500}
                          className="w-full py-1.5 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent transition-colors"
                        />
                        <span className="text-[10px] text-foreground/30 mt-0.5 block text-right">
                          {(altTexts[index] || "").length}/500
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Link Input */}
              {imageMode === "link" && (
                <div className="space-y-3">
                  <div>
                    <input
                      type="url"
                      value={imageLinkUrl}
                      onChange={(e) => {
                        setImageLinkUrl(e.target.value);
                        setImageLinkError(null);
                        if (e.target.value.trim()) {
                          try {
                            const url = new URL(e.target.value);
                            if (!url.protocol.startsWith("http")) {
                              setImageLinkError("Please enter a valid HTTP or HTTPS URL");
                            }
                          } catch {
                            setImageLinkError("Please enter a valid URL");
                          }
                        }
                      }}
                      placeholder="Paste image URL (e.g. https://example.com/image.jpg)"
                      className={`w-full py-3 px-4 rounded-xl bg-background/50 border text-foreground placeholder:text-foreground/40 focus:outline-none transition-colors ${
                        imageLinkError
                          ? "border-vocl-like focus:border-vocl-like"
                          : imageLinkUrl && !imageLinkError
                            ? "border-green-500 focus:border-green-500"
                            : "border-white/10 focus:border-vocl-accent"
                      }`}
                    />
                    {imageLinkError && (
                      <p className="mt-2 text-xs text-vocl-like">{imageLinkError}</p>
                    )}
                    {imageLinkUrl && !imageLinkError && (
                      <p className="mt-2 text-xs text-green-500 flex items-center gap-1">
                        <IconCheck size={14} />
                        Image URL ready
                      </p>
                    )}
                  </div>

                  {/* Preview */}
                  {imageLinkUrl && !imageLinkError && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={imageLinkUrl}
                        alt="Preview"
                        className="w-full max-h-64 object-contain bg-black/20"
                        onError={() => setImageLinkError("Could not load image from this URL")}
                      />
                    </div>
                  )}

                  {/* Alt text for linked image */}
                  {imageLinkUrl && !imageLinkError && (
                    <div className="space-y-1">
                      <p className="text-xs text-foreground/40">Alt text helps people using screen readers</p>
                      <input
                        type="text"
                        value={altTexts[0] || ""}
                        onChange={(e) => setAltTexts([e.target.value.slice(0, 500)])}
                        placeholder="Describe this image (alt text)"
                        maxLength={500}
                        className="w-full py-1.5 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent transition-colors"
                      />
                      <span className="text-[10px] text-foreground/30 block text-right">
                        {(altTexts[0] || "").length}/500
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-foreground/40">
                    Paste a direct link to an image. Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              )}

              {/* Unsplash Search */}
              {imageMode === "unsplash" && (
                <div className="space-y-3">
                  <div className="relative">
                    <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                    <input
                      type="text"
                      value={unsplashQuery}
                      onChange={(e) => setUnsplashQuery(e.target.value)}
                      placeholder="Search Unsplash photos..."
                      className="w-full pl-10 pr-3 py-2.5 text-sm bg-background/50 rounded-xl border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
                    />
                  </div>

                  {isSearchingUnsplash && (
                    <div className="flex justify-center py-8">
                      <IconLoader2 size={24} className="animate-spin text-vocl-accent" />
                    </div>
                  )}

                  {/* Selected photo */}
                  {selectedUnsplash && (
                    <div className="relative rounded-xl overflow-hidden border border-vocl-accent/50">
                      <img
                        src={selectedUnsplash.urls.small}
                        alt={selectedUnsplash.alt_description || ""}
                        className="w-full max-h-64 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-3 py-2 text-xs text-white">
                        Photo by{" "}
                        <a
                          href={`${selectedUnsplash.user.links.html}?utm_source=bevocl&utm_medium=referral`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          {selectedUnsplash.user.name}
                        </a>{" "}
                        on{" "}
                        <a
                          href="https://unsplash.com/?utm_source=bevocl&utm_medium=referral"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Unsplash
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUnsplash(null);
                          setAltTexts([]);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                      >
                        <IconX size={14} />
                      </button>
                    </div>
                  )}

                  {/* Alt text for Unsplash image */}
                  {selectedUnsplash && (
                    <div className="space-y-1">
                      <p className="text-xs text-foreground/40">Alt text helps people using screen readers</p>
                      <input
                        type="text"
                        value={altTexts[0] || ""}
                        onChange={(e) => setAltTexts([e.target.value.slice(0, 500)])}
                        placeholder="Describe this image (alt text)"
                        maxLength={500}
                        className="w-full py-1.5 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent transition-colors"
                      />
                      <span className="text-[10px] text-foreground/30 block text-right">
                        {(altTexts[0] || "").length}/500
                      </span>
                    </div>
                  )}

                  {/* Results grid */}
                  {!selectedUnsplash && unsplashResults.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                      {unsplashResults.map((photo: any) => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={async () => {
                            setSelectedUnsplash(photo);
                            // Pre-fill alt text from Unsplash description
                            setAltTexts([photo.alt_description || ""]);
                            // Trigger download tracking (Unsplash requirement)
                            try {
                              await fetch("/api/unsplash/download", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ downloadLocation: photo.links.download_location }),
                              });
                            } catch {}
                          }}
                          className="relative rounded-lg overflow-hidden hover:opacity-80 transition-opacity aspect-square"
                        >
                          <img
                            src={photo.urls.thumb}
                            alt={photo.alt_description || ""}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-[10px] text-white truncate">
                            {photo.user.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isSearchingUnsplash && unsplashQuery.length >= 2 && unsplashResults.length === 0 && (
                    <p className="text-center text-foreground/40 text-sm py-4">No photos found</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* GIF Picker */}
          {postType === "gif" && (
            <div className="space-y-4">
              {selectedGifUrl ? (
                <>
                  <div className="relative rounded-xl overflow-hidden border border-vocl-accent/50">
                    <img
                      src={selectedGifUrl}
                      alt="Selected GIF"
                      className="w-full max-h-80 object-contain bg-black/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGifUrl(null);
                        setAltTexts([]);
                        setGifPickerOpen(true);
                      }}
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                  {/* Alt text for GIF */}
                  <div className="space-y-1">
                    <p className="text-xs text-foreground/40">Alt text helps people using screen readers</p>
                    <input
                      type="text"
                      value={altTexts[0] || ""}
                      onChange={(e) => setAltTexts([e.target.value.slice(0, 500)])}
                      placeholder="Describe this GIF (alt text)"
                      maxLength={500}
                      className="w-full py-1.5 px-3 text-sm bg-white/5 border border-white/10 rounded-lg text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-vocl-accent transition-colors"
                    />
                    <span className="text-[10px] text-foreground/30 block text-right">
                      {(altTexts[0] || "").length}/500
                    </span>
                  </div>
                </>
              ) : (
                <div className="relative">
                  <GifPicker
                    isOpen={gifPickerOpen}
                    onClose={() => setGifPickerOpen(false)}
                    onSelect={(gifUrl) => {
                      setSelectedGifUrl(gifUrl);
                      setGifPickerOpen(false);
                    }}
                    inline
                  />
                  {!gifPickerOpen && (
                    <button
                      type="button"
                      onClick={() => setGifPickerOpen(true)}
                      className="w-full py-8 rounded-xl border border-dashed border-white/20 hover:border-vocl-accent/50 bg-background/30 flex flex-col items-center gap-2 text-foreground/50 hover:text-vocl-accent transition-colors"
                    >
                      <IconGif size={32} />
                      <span className="text-sm font-medium">Click to browse GIFs</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Poll Editor */}
          {postType === "poll" && (
            <div className="space-y-4">
              {/* Poll Question */}
              <div>
                <label className="block text-sm text-foreground/60 mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full py-3 px-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent"
                  maxLength={280}
                />
              </div>

              {/* Poll Options */}
              <div>
                <label className="block text-sm text-foreground/60 mb-2">
                  Options
                </label>
                <div className="space-y-2">
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...pollOptions];
                            newOptions[index] = e.target.value;
                            setPollOptions(newOptions);
                          }}
                          placeholder={`Option ${index + 1}`}
                          className="w-full py-2.5 px-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent"
                          maxLength={100}
                        />
                      </div>
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newOptions = pollOptions.filter(
                              (_, i) => i !== index,
                            );
                            setPollOptions(newOptions);
                          }}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-foreground/40 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                        >
                          <IconTrash size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 4 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="mt-2 flex items-center gap-2 text-sm text-vocl-accent hover:text-vocl-accent-hover transition-colors"
                  >
                    <IconPlus size={16} />
                    Add option
                  </button>
                )}
              </div>

              {/* Poll Settings */}
              <div className="space-y-3 pt-2">
                {/* Expiration */}
                <div>
                  <label className="block text-sm text-foreground/60 mb-2">
                    Poll duration (optional)
                  </label>
                  <select
                    value={pollExpiresAt}
                    onChange={(e) => setPollExpiresAt(e.target.value)}
                    className="w-full py-2.5 px-4 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent"
                  >
                    <option value="">No expiration</option>
                    <option
                      value={new Date(
                        Date.now() + 1 * 24 * 60 * 60 * 1000,
                      ).toISOString()}
                    >
                      1 day
                    </option>
                    <option
                      value={new Date(
                        Date.now() + 3 * 24 * 60 * 60 * 1000,
                      ).toISOString()}
                    >
                      3 days
                    </option>
                    <option
                      value={new Date(
                        Date.now() + 7 * 24 * 60 * 60 * 1000,
                      ).toISOString()}
                    >
                      1 week
                    </option>
                  </select>
                </div>

                {/* Show results before voting */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-background/30 cursor-pointer">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      pollShowResultsBeforeVote ? "bg-vocl-accent" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        pollShowResultsBeforeVote ? "left-6" : "left-1"
                      }`}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={pollShowResultsBeforeVote}
                    onChange={(e) =>
                      setPollShowResultsBeforeVote(e.target.checked)
                    }
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="text-foreground text-sm font-medium">
                      Show results before voting
                    </div>
                    <p className="text-foreground/40 text-xs mt-0.5">
                      Let users see results without voting first
                    </p>
                  </div>
                </label>

                {/* Allow multiple selections */}
                <label className="flex items-center gap-3 p-3 rounded-xl bg-background/30 cursor-pointer">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      pollAllowMultiple ? "bg-vocl-accent" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        pollAllowMultiple ? "left-6" : "left-1"
                      }`}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={pollAllowMultiple}
                    onChange={(e) => setPollAllowMultiple(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="text-foreground text-sm font-medium">
                      Allow multiple choices
                    </div>
                    <p className="text-foreground/40 text-xs mt-0.5">
                      Users can select more than one option
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Text Editor (not for polls) */}
          {postType !== "poll" && (
            <div>
              {postType !== "text" && (
                <label className="block text-sm text-foreground/60 mb-2">
                  Caption (optional)
                </label>
              )}
              <RichTextEditor
                placeholder={
                  postType === "text"
                    ? "What's on your mind?"
                    : "Add a caption..."
                }
                onChange={(html, plain) => setContent({ html, plain })}
                minHeight={postType === "text" ? "200px" : "80px"}
              />
            </div>
          )}

          {/* Link previews for text posts */}
          {postType === "text" && (linkPreviews.length > 0 || linkPreviewsLoading) && (
            <LinkPreviewCarousel
              previews={linkPreviews}
              editable
              onDismiss={dismissLinkPreview}
              isLoading={linkPreviewsLoading}
            />
          )}

          {/* Tags */}
          <TagInput tags={tags} onChange={setTags} />

          {/* Publish Options */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowPublishOptions(!showPublishOptions)}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-background/30 hover:bg-background/40 transition-colors"
            >
              <div className="flex items-center gap-3">
                {publishMode === "now" && (
                  <IconSend size={18} className="text-vocl-accent" />
                )}
                {publishMode === "queue" && (
                  <IconClock size={18} className="text-yellow-500" />
                )}
                {publishMode === "schedule" && (
                  <IconCalendar size={18} className="text-blue-500" />
                )}
                <div className="text-left">
                  <div className="text-foreground font-medium">
                    {publishMode === "now" && "Post now"}
                    {publishMode === "queue" && "Add to queue"}
                    {publishMode === "schedule" && "Schedule"}
                  </div>
                  <p className="text-foreground/40 text-xs">
                    {publishMode === "now"
                      ? "Publish immediately"
                      : publishMode === "queue"
                        ? "Post will be published based on your queue settings"
                        : publishMode === "schedule" && scheduledDate
                          ? `${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime}`
                          : "Choose a date and time"}
                  </p>
                </div>
              </div>
              <IconChevronDown
                size={18}
                className={`text-foreground/40 transition-transform ${showPublishOptions ? "rotate-180" : ""}`}
              />
            </button>

            {showPublishOptions && (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* Post Now */}
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("now");
                    setShowPublishOptions(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 transition-colors ${
                    publishMode === "now"
                      ? "bg-vocl-accent/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <IconSend
                    size={18}
                    className={
                      publishMode === "now"
                        ? "text-vocl-accent"
                        : "text-foreground/60"
                    }
                  />
                  <div className="text-left flex-1">
                    <div
                      className={`font-medium ${publishMode === "now" ? "text-vocl-accent" : "text-foreground"}`}
                    >
                      Post now
                    </div>
                    <p className="text-foreground/40 text-xs">
                      Publish immediately
                    </p>
                  </div>
                </button>

                {/* Add to Queue */}
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("queue");
                    setShowPublishOptions(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 border-t border-white/10 transition-colors ${
                    publishMode === "queue"
                      ? "bg-yellow-500/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <IconClock
                    size={18}
                    className={
                      publishMode === "queue"
                        ? "text-yellow-500"
                        : "text-foreground/60"
                    }
                  />
                  <div className="text-left flex-1">
                    <div
                      className={`font-medium ${publishMode === "queue" ? "text-yellow-500" : "text-foreground"}`}
                    >
                      Add to queue
                    </div>
                    <p className="text-foreground/40 text-xs">
                      Published based on your queue schedule
                    </p>
                  </div>
                </button>

                {/* Schedule */}
                <button
                  type="button"
                  onClick={() => {
                    setPublishMode("schedule");
                  }}
                  className={`w-full flex items-center gap-3 p-3 border-t border-white/10 transition-colors ${
                    publishMode === "schedule"
                      ? "bg-blue-500/20"
                      : "hover:bg-white/5"
                  }`}
                >
                  <IconCalendar
                    size={18}
                    className={
                      publishMode === "schedule"
                        ? "text-blue-500"
                        : "text-foreground/60"
                    }
                  />
                  <div className="text-left flex-1">
                    <div
                      className={`font-medium ${publishMode === "schedule" ? "text-blue-500" : "text-foreground"}`}
                    >
                      Schedule
                    </div>
                    <p className="text-foreground/40 text-xs">
                      Choose a specific date and time
                    </p>
                  </div>
                </button>

                {/* Schedule Date/Time Picker */}
                {publishMode === "schedule" && (
                  <div className="p-3 border-t border-white/10 bg-background/30 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-foreground/40 mb-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full py-2 px-3 rounded-lg bg-vocl-surface-dark border border-white/10 text-foreground text-sm focus:outline-none focus:border-vocl-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-foreground/40 mb-1">
                          Time
                        </label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full py-2 px-3 rounded-lg bg-vocl-surface-dark border border-white/10 text-foreground text-sm focus:outline-none focus:border-vocl-accent"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPublishOptions(false)}
                      className="w-full py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sensitive Content Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isSensitive}
            onClick={() => setIsSensitive((v) => !v)}
            className="flex items-center gap-3 p-3 rounded-xl bg-background/30 cursor-pointer w-full text-left"
          >
            <div
              className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${
                isSensitive ? "bg-vocl-like" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  isSensitive ? "left-6" : "left-1"
                }`}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-foreground">
                <IconAlertTriangle size={18} />
                <span className="font-medium">Sensitive content</span>
              </div>
              <p className="text-foreground/40 text-xs mt-0.5">
                Mark this post as containing mature content
              </p>
            </div>
          </button>

          {/* Content Warning */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/70">
              Content Warning (optional)
            </label>
            <input
              type="text"
              value={contentWarning}
              onChange={(e) => setContentWarning(e.target.value)}
              placeholder="e.g. spoilers, food mention, flashing images..."
              maxLength={200}
              className="w-full px-3 py-2 text-sm bg-background/50 rounded-xl border border-white/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-vocl-accent"
            />
            {contentWarning && (
              <span className="text-xs text-foreground/40">{contentWarning.length}/200</span>
            )}
          </div>

          {/* Error Message */}
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
              onClick={handleClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 ${
                publishMode === "queue"
                  ? "bg-yellow-500 text-black hover:bg-yellow-400"
                  : publishMode === "schedule"
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
              }`}
            >
              {isPending ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  {publishMode === "now" && "Posting..."}
                  {publishMode === "queue" && "Adding to queue..."}
                  {publishMode === "schedule" && "Scheduling..."}
                </>
              ) : (
                <>
                  {publishMode === "now" && (
                    <>
                      <IconSend size={18} />
                      Post
                    </>
                  )}
                  {publishMode === "queue" && (
                    <>
                      <IconClock size={18} />
                      Add to Queue
                    </>
                  )}
                  {publishMode === "schedule" && (
                    <>
                      <IconCalendar size={18} />
                      Schedule
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
