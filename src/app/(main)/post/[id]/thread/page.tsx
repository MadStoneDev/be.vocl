"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  IconArrowLeft,
  IconLoader2,
  IconHeart,
  IconMessageCircle,
  IconRepeat,
  IconArrowForward,
} from "@tabler/icons-react";
import { getReblogThread } from "@/actions/reblog-thread";
import { Avatar } from "@/components/ui";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";

interface ThreadEntry {
  id: string;
  authorUsername: string;
  authorDisplayName: string | null;
  authorAvatarUrl: string | null;
  reblogComment: string | null;
  postType: string;
  content: any;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  depth: number;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function ThreadEntry({ entry, isLast }: { entry: ThreadEntry; isLast: boolean }) {
  const indent = Math.min(entry.depth, 3);
  const marginLeft = indent * 24;

  return (
    <div className="relative" style={{ marginLeft: `${marginLeft}px` }}>
      {/* Vertical thread line */}
      {!isLast && (
        <div
          className="absolute left-5 top-12 bottom-0 border-l-2 border-white/10"
          aria-hidden="true"
        />
      )}

      <Link
        href={`/post/${entry.id}`}
        className="block p-4 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-colors"
      >
        {/* Author header */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar
            src={entry.authorAvatarUrl}
            username={entry.authorUsername}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground truncate">
                {entry.authorDisplayName || entry.authorUsername}
              </span>
              <span className="text-sm text-foreground/40">
                @{entry.authorUsername}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-foreground/40">
              <span>{formatRelativeTime(entry.createdAt)}</span>
              {entry.depth > 0 && (
                <>
                  <IconArrowForward size={12} className="text-vocl-accent/60" />
                  <span className="text-vocl-accent/60">echoed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reblog comment */}
        {entry.reblogComment && (
          <div
            className="mb-3 text-sm text-foreground/80 border-l-2 border-vocl-accent/30 pl-3"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(entry.reblogComment) }}
          />
        )}

        {/* Original content preview (only for depth 0) */}
        {entry.depth === 0 && entry.content && (
          <div className="mb-3">
            {entry.postType === "text" && entry.content.plain && (
              <p className="text-sm text-foreground/70 line-clamp-3">
                {entry.content.plain}
              </p>
            )}
            {entry.postType === "image" && (
              <div className="text-sm text-foreground/50 italic">
                Image post
              </div>
            )}
            {entry.postType === "gallery" && (
              <div className="text-sm text-foreground/50 italic">
                Gallery post
              </div>
            )}
            {entry.postType === "video" && (
              <div className="text-sm text-foreground/50 italic">
                Video post
              </div>
            )}
            {entry.postType === "audio" && (
              <div className="text-sm text-foreground/50 italic">
                Audio post
              </div>
            )}
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center gap-4 text-xs text-foreground/40">
          <span className="flex items-center gap-1">
            <IconHeart size={14} />
            {entry.likeCount}
          </span>
          <span className="flex items-center gap-1">
            <IconMessageCircle size={14} />
            {entry.commentCount}
          </span>
          <span className="flex items-center gap-1">
            <IconRepeat size={14} />
            {entry.reblogCount}
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function ReblogThreadPage() {
  const params = useParams();
  const postId = params.id as string;

  const [thread, setThread] = useState<ThreadEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchThread() {
      setIsLoading(true);
      setError(null);

      const result = await getReblogThread(postId);

      if (result.success) {
        setThread(result.thread);
      } else {
        setError(result.error || "Failed to load thread");
      }

      setIsLoading(false);
    }

    if (postId) {
      fetchThread();
    }
  }, [postId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <IconLoader2 size={40} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Thread Not Found
        </h1>
        <p className="text-foreground/60 mb-6">{error}</p>
        <Link
          href={`/post/${postId}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-vocl-accent text-white rounded-xl hover:bg-vocl-accent-hover transition-colors"
        >
          <IconArrowLeft size={18} />
          Back to Post
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/post/${postId}`}
          className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors"
        >
          <IconArrowLeft size={18} />
          Back to post
        </Link>
      </div>

      <h1 className="text-xl font-bold text-foreground mb-1">Reblog Thread</h1>
      <p className="text-sm text-foreground/50 mb-6">
        {thread.length} {thread.length === 1 ? "post" : "posts"} in this thread
      </p>

      {/* Thread entries */}
      {thread.length === 0 ? (
        <div className="text-center py-12 text-foreground/40">
          No reblog thread found for this post.
        </div>
      ) : (
        <div className="space-y-3">
          {thread.map((entry, index) => (
            <ThreadEntry
              key={entry.id}
              entry={entry}
              isLast={index === thread.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
