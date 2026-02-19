"use client";

import { useState, useTransition, useEffect } from "react";
import {
  IconX,
  IconLoader2,
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { RichTextEditor } from "./RichTextEditor";
import { TagInput } from "./TagInput";
import { LinkPreviewCarousel } from "@/components/Post/content/LinkPreviewCarousel";
import { useLinkPreviews } from "@/hooks/useLinkPreviews";
import { updatePost } from "@/actions/posts";
import type { TextPostContent, ImagePostContent, VideoPostContent, AudioPostContent, LinkPreviewData } from "@/types/database";

interface UpdatedPostData {
  content: any;
  isSensitive: boolean;
  tags: Array<{ id: string; name: string }>;
}

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedData: UpdatedPostData) => void;
  post: {
    id: string;
    postType: string;
    content: any;
    isSensitive: boolean;
    tags: Array<{ id: string; name: string }>;
  };
}

export function EditPostModal({
  isOpen,
  onClose,
  onSuccess,
  post,
}: EditPostModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Text content (for text posts or captions)
  const [textContent, setTextContent] = useState({ html: "", plain: "" });

  // Tags
  const [tags, setTags] = useState<string[]>([]);

  // Sensitive flag
  const [isSensitive, setIsSensitive] = useState(false);

  // Link previews for text posts
  const isTextPost_ = post?.postType === "text";
  const existingPreviews: LinkPreviewData[] =
    isTextPost_ && post?.content?.link_previews ? post.content.link_previews : [];
  const {
    previews: linkPreviews,
    isLoading: linkPreviewsLoading,
    dismiss: dismissLinkPreview,
    getPreviewsForSave,
  } = useLinkPreviews({
    text: isTextPost_ ? textContent.plain : "",
    initialPreviews: existingPreviews,
  });

  // Initialize state from post data when modal opens
  useEffect(() => {
    if (isOpen && post) {
      // Set sensitive flag
      setIsSensitive(post.isSensitive);

      // Set tags
      setTags(post.tags.map((t) => t.name));

      // Set content based on post type
      if (post.postType === "text") {
        const content = post.content as TextPostContent;
        setTextContent({
          html: content.html || "",
          plain: content.plain || "",
        });
      } else {
        // For media posts, extract caption
        const content = post.content as ImagePostContent | VideoPostContent | AudioPostContent;
        const captionHtml = content.caption_html || "";
        setTextContent({
          html: captionHtml,
          plain: captionHtml.replace(/<[^>]*>/g, ""),
        });
      }

      setError(null);
    }
  }, [isOpen, post]);

  const handleSubmit = async () => {
    setError(null);

    // Validate text content for text posts
    if (post.postType === "text" && !textContent.plain.trim()) {
      setError("Please write something");
      return;
    }

    startTransition(async () => {
      // Build updated content
      let updatedContent: any;

      if (post.postType === "text") {
        const savedPreviews = getPreviewsForSave();
        updatedContent = {
          html: textContent.html,
          plain: textContent.plain,
          ...(savedPreviews.length > 0 && { link_previews: savedPreviews }),
        } as TextPostContent;
      } else {
        // For media posts, preserve original content and update caption
        updatedContent = {
          ...post.content,
          caption_html: textContent.html || undefined,
        };
      }

      const result = await updatePost({
        postId: post.id,
        content: updatedContent,
        isSensitive,
        tags,
      });

      if (result.success) {
        // Pass back the updated data so the post can update locally without page refresh
        onSuccess?.({
          content: updatedContent,
          isSensitive,
          tags: tags.map((name, idx) => ({ id: `temp-${idx}`, name })),
        });
        onClose();
      } else {
        setError(result.error || "Failed to update post");
      }
    });
  };

  if (!isOpen) return null;

  const isTextPost = post.postType === "text";
  const title = isTextPost ? "Edit Post" : "Edit Caption & Tags";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div
        className="relative w-full max-w-lg bg-vocl-surface rounded-2xl shadow-xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 id="edit-modal-title" className="font-semibold text-lg text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <IconAlertTriangle size={18} className="text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Text Editor */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              {isTextPost ? "Content" : "Caption"}
            </label>
            <RichTextEditor
              content={textContent.html}
              onChange={(html, plain) => setTextContent({ html, plain })}
              placeholder={isTextPost ? "What's on your mind?" : "Add a caption..."}
              minHeight={isTextPost ? "120px" : "80px"}
            />
          </div>

          {/* Link previews for text posts */}
          {isTextPost && (linkPreviews.length > 0 || linkPreviewsLoading) && (
            <LinkPreviewCarousel
              previews={linkPreviews}
              editable
              onDismiss={dismissLinkPreview}
              isLoading={linkPreviewsLoading}
            />
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-2">
              Tags
            </label>
            <TagInput
              tags={tags}
              onChange={setTags}
              placeholder="Add tags..."
            />
          </div>

          {/* Sensitive content toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-vocl-surface-dark">
            <div className="flex items-center gap-3">
              {isSensitive ? (
                <IconEyeOff size={20} className="text-amber-500" />
              ) : (
                <IconEye size={20} className="text-foreground/50" />
              )}
              <div>
                <p className="font-medium text-foreground text-sm">
                  Sensitive content
                </p>
                <p className="text-xs text-foreground/50">
                  Mark if this contains mature themes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSensitive(!isSensitive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isSensitive ? "bg-amber-500" : "bg-white/10"
              }`}
              role="switch"
              aria-checked={isSensitive}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  isSensitive ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <>
                <IconLoader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <IconCheck size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
