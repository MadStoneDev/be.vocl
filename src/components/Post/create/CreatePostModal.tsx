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
} from "@tabler/icons-react";
import { RichTextEditor } from "./RichTextEditor";
import { MediaUploader } from "./MediaUploader";
import { TagInput } from "./TagInput";
import { createPost, generatePostId } from "@/actions/posts";
import type {
  TextPostContent,
  ImagePostContent,
  VideoPostContent,
  AudioPostContent,
} from "@/types/database";

type PostType = "text" | "image" | "video" | "audio";
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
    if (postType !== "text" && mediaUrls.length === 0) {
      setError(
        `Please upload ${postType === "image" ? "at least one image" : postType === "video" ? "a video" : "an audio file"}`,
      );
      return;
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
        | AudioPostContent;
      let actualPostType: "text" | "image" | "video" | "audio" | "gallery" =
        postType;

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
          postContent = {
            url: mediaUrls[0],
            caption_html: content.html || undefined,
          } as VideoPostContent;
          break;

        case "audio":
          postContent = {
            url: mediaUrls[0],
            caption_html: content.html || undefined,
          } as AudioPostContent;
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

          {/* Media Upload (for image/video/audio) */}
          {postType !== "text" && postId && (
            <MediaUploader
              postId={postId}
              mediaType={postType}
              onUploadComplete={setMediaUrls}
              maxFiles={postType === "image" ? 10 : 1}
              existingUrls={mediaUrls}
            />
          )}

          {/* Text Editor */}
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
