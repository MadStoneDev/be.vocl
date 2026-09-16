"use client";

import { useState, useEffect, useCallback } from "react";
import { IconX, IconLoader2 } from "@tabler/icons-react";
import { getPostsByUser } from "@/actions/posts";
import { sharePostToConversation } from "@/actions/messages";
import { Portal, toast } from "@/components/ui";

interface PickablePost {
  id: string;
  postType: string;
  excerpt: string;
  isSensitive: boolean;
}

interface PostPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId?: string;
}

function toExcerpt(raw: unknown, max = 120): string {
  if (typeof raw !== "string" || !raw) return "";
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/**
 * Pick one of your own recent posts to send into the OPEN conversation. The sent
 * message appears via the realtime message stream (its shared-post card resolves
 * automatically). Complements SharePostModal, which shares a given post to a
 * chosen person from the post menu.
 */
export function PostPickerModal({ isOpen, onClose, conversationId, currentUserId }: PostPickerModalProps) {
  const [posts, setPosts] = useState<PickablePost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    let cancelled = false;
    setIsLoading(true);
    getPostsByUser(currentUserId, { limit: 20 }).then((res) => {
      if (cancelled) return;
      if (res.success && res.posts) {
        setPosts(
          res.posts.map((p: any) => {
            const c = p.content ?? {};
            return {
              id: p.id,
              postType: p.post_type,
              excerpt: toExcerpt(c.plain) || toExcerpt(c.caption_html) || toExcerpt(c.question),
              isSensitive: Boolean(p.is_sensitive),
            };
          })
        );
      }
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, currentUserId]);

  const handlePick = useCallback(
    async (postId: string) => {
      setSendingId(postId);
      const res = await sharePostToConversation(conversationId, postId);
      setSendingId(null);
      if (res.success) {
        toast.success("Post shared");
        onClose();
      } else {
        toast.error(res.error || "Couldn't share the post");
      }
    },
    [conversationId, onClose]
  );

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />

        <div className="relative flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden border border-rule bg-background">
          <div className="flex items-center justify-between border-b border-rule px-5 py-4">
            <div>
              <p className="kicker kicker-accent">Share a post</p>
              <h2 className="font-display text-2xl text-ink">Your recent posts</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-meta hover:text-ink transition-colors">
              <IconX size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <IconLoader2 size={22} className="animate-spin text-accent" />
              </div>
            ) : posts.length > 0 ? (
              posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => handlePick(post.id)}
                  disabled={sendingId !== null}
                  className="flex w-full items-center gap-3 border-b border-rule px-5 py-3 text-left transition-colors hover:bg-vocl-hover disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="slug block text-meta-dim">{post.postType}</span>
                    <span className="mt-1 block truncate font-serif text-[15px] text-ink">
                      {post.isSensitive
                        ? "Sensitive post"
                        : post.excerpt || `A ${post.postType} post`}
                    </span>
                  </span>
                  {sendingId === post.id && <IconLoader2 size={18} className="animate-spin text-accent" />}
                </button>
              ))
            ) : (
              <p className="editorial-body px-5 py-10 text-center text-meta">
                You haven&apos;t posted anything yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
