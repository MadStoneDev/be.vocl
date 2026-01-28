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
} from "@tabler/icons-react";
import { RichTextEditor } from "./RichTextEditor";
import { MediaUploader } from "./MediaUploader";
import { TagInput } from "./TagInput";
import {
  createTextPost,
  createImagePost,
  createVideoPost,
  createAudioPost,
  generatePostId,
} from "@/actions/posts";

type PostType = "text" | "image" | "video" | "audio";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (postId: string) => void;
}

export function CreatePostModal({ isOpen, onClose, onSuccess }: CreatePostModalProps) {
  const [isPending, startTransition] = useTransition();
  const [postType, setPostType] = useState<PostType>("text");
  const [postId, setPostId] = useState<string>("");
  const [content, setContent] = useState({ html: "", plain: "" });
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isSensitive, setIsSensitive] = useState(false);
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
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);

    startTransition(async () => {
      let result;

      switch (postType) {
        case "text":
          if (!content.plain.trim()) {
            setError("Please write something");
            return;
          }
          result = await createTextPost(content.html, content.plain, {
            isSensitive,
            tags,
          });
          break;

        case "image":
          if (mediaUrls.length === 0) {
            setError("Please upload at least one image");
            return;
          }
          result = await createImagePost(
            mediaUrls,
            mediaUrls.map(() => ""), // Alt texts - TODO: add alt text input
            content.html || undefined,
            { isSensitive, tags }
          );
          break;

        case "video":
          if (mediaUrls.length === 0) {
            setError("Please upload a video");
            return;
          }
          result = await createVideoPost(
            mediaUrls[0],
            undefined,
            undefined,
            content.html || undefined,
            { isSensitive, tags }
          );
          break;

        case "audio":
          if (mediaUrls.length === 0) {
            setError("Please upload an audio file");
            return;
          }
          result = await createAudioPost(
            mediaUrls[0],
            undefined,
            undefined,
            content.html || undefined,
            { isSensitive, tags }
          );
          break;
      }

      if (result?.success && result.postId) {
        onSuccess?.(result.postId);
        onClose();
      } else {
        setError(result?.error || "Failed to create post");
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
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-vocl-surface-dark rounded-3xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
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
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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
            <label className="block text-sm text-foreground/60 mb-2">
              {postType === "text" ? "Your post" : "Caption (optional)"}
            </label>
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
          <div>
            <label className="block text-sm text-foreground/60 mb-2">Tags</label>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          {/* Sensitive Content Toggle */}
          <label className="flex items-center gap-3 p-4 rounded-xl bg-background/30 cursor-pointer">
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
              <p className="text-foreground/40 text-sm mt-0.5">
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
              className="px-6 py-2.5 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
