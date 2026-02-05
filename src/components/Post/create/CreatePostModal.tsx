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
} from "@tabler/icons-react";
import { parseVideoUrl, SUPPORTED_VIDEO_PLATFORMS } from "@/lib/video-embeds";
import { RichTextEditor } from "./RichTextEditor";
import { MediaUploader } from "./MediaUploader";
import { TagInput } from "./TagInput";
import { createPost, generatePostId } from "@/actions/posts";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
  PollPostContent,
} from "@/types/database";

type PostType = "text" | "image" | "video" | "audio" | "poll";
type PublishMode = "now" | "queue" | "schedule";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (postId: string) => void;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onSuccess,
}: CreatePostModalProps) {
  const [isPending, startTransition] = useTransition();
  const [postType, setPostType] = useState<PostType>("text");
  const [postId, setPostId] = useState<string>("");
  const [content, setContent] = useState({ html: "", plain: "" });
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSensitive, setIsSensitive] = useState(false);
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

  // Video-specific state
  const [videoMode, setVideoMode] = useState<"embed" | "upload">("embed");
  const [videoEmbedUrl, setVideoEmbedUrl] = useState("");
  const [videoEmbedError, setVideoEmbedError] = useState<string | null>(null);

  // Legal acknowledgment for file uploads
  const [hasAcknowledgedRights, setHasAcknowledgedRights] = useState(false);

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
      // Reset video state
      setVideoMode("embed");
      setVideoEmbedUrl("");
      setVideoEmbedError(null);
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
      if (mediaUrls.length === 0) {
        setError("Please upload an audio file");
        return;
      }
      if (!hasAcknowledgedRights) {
        setError("Please acknowledge that you have the rights to publish this content");
        return;
      }
    } else if (postType === "image" && mediaUrls.length === 0) {
      setError("Please upload at least one image");
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
        | "poll" = postType;

      switch (postType) {
        case "text":
          postContent = {
            html: content.html,
            plain: content.plain,
          } as TextPostContent;
          break;

        case "image":
          postContent = {
            urls: mediaUrls,
            alt_texts: mediaUrls.map(() => ""),
            caption_html: content.html || undefined,
          } as ImagePostContent;
          if (mediaUrls.length > 1) {
            actualPostType = "gallery";
          }
          break;

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
          postContent = {
            url: mediaUrls[0],
            caption_html: content.html || undefined,
          } as AudioPostContent;
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
      });

      if (result.success && result.postId) {
        onSuccess?.(result.postId);
        onClose();
      } else {
        setError(result.error || "Failed to create post");
      }
    });
  };

  if (!isOpen) return null;

  const postTypes = [
    { type: "text" as const, icon: IconFileText, label: "Text" },
    { type: "image" as const, icon: IconPhoto, label: "Image" },
    { type: "video" as const, icon: IconVideo, label: "Video" },
    { type: "audio" as const, icon: IconMusic, label: "Audio" },
    { type: "poll" as const, icon: IconChartBar, label: "Poll" },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-vocl-surface-dark rounded-3xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
          <h2 className="font-semibold text-foreground text-lg">Create Post</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {/* Post Type Selector */}
          <div className="flex rounded-2xl bg-background/50 p-1">
            {postTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setPostType(type);
                  setMediaUrls([]);
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

          {/* Audio Post with Legal Disclaimer */}
          {postType === "audio" && postId && (
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

          {/* Image Upload */}
          {postType === "image" && postId && (
            <MediaUploader
              postId={postId}
              mediaType="image"
              onUploadComplete={setMediaUrls}
              maxFiles={10}
              existingUrls={mediaUrls}
            />
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
          <label className="flex items-center gap-3 p-3 rounded-xl bg-background/30 cursor-pointer">
            <div
              className={`relative w-12 h-7 rounded-full transition-colors ${
                isSensitive ? "bg-vocl-like" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
                  isSensitive ? "left-6" : "left-1"
                }`}
              />
            </div>
            <input
              type="checkbox"
              checked={isSensitive}
              onChange={(e) => setIsSensitive(e.target.checked)}
              className="sr-only"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-foreground">
                <IconAlertTriangle size={18} />
                <span className="font-medium">Sensitive content</span>
              </div>
              <p className="text-foreground/40 text-xs mt-0.5">
                Mark this post as containing mature content
              </p>
            </div>
          </label>

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
