"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconCalendarEvent,
  IconArrowLeft,
  IconLoader2,
  IconHeart,
  IconMessage,
  IconRefresh,
} from "@tabler/icons-react";
import { getOnThisDay, type OnThisDayPost } from "@/actions/on-this-day";

function snippet(post: OnThisDayPost): string {
  const c = post.content || {};
  switch (post.postType) {
    case "text": {
      const raw = c.plain || c.html || "";
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220);
    }
    case "image":
    case "gallery":
      return c.caption_html?.replace(/<[^>]+>/g, " ") || "Image post";
    case "video":
      return c.caption_html?.replace(/<[^>]+>/g, " ") || "Video post";
    case "audio":
      return c.is_voice_note ? "Voice note" : "Audio post";
    case "poll":
      return c.question || "Poll";
    default:
      return "";
  }
}

function thumbnail(post: OnThisDayPost): string | null {
  const c = post.content || {};
  if (post.postType === "image" || post.postType === "gallery") {
    return c.urls?.[0] || c.url || null;
  }
  if (post.postType === "video") return c.thumbnail_url || null;
  if (post.postType === "audio") return c.album_art_url || null;
  return null;
}

export default function OnThisDayPage() {
  const [posts, setPosts] = useState<OnThisDayPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOnThisDay().then((r) => {
      if (r.success) setPosts(r.posts || []);
      setLoading(false);
    });
  }, []);

  const today = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 max-w-2xl mx-auto">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-foreground mb-4 transition-colors"
      >
        <IconArrowLeft size={16} />
        Back to feed
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <IconCalendarEvent size={26} className="text-vocl-accent" />
          On this day
        </h1>
        <p className="text-sm text-foreground/60 mt-1">
          Your posts from {today} in previous years
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl bg-white/5 border border-white/5 p-10 text-center">
          <IconCalendarEvent size={40} className="mx-auto text-foreground/20 mb-3" />
          <p className="text-sm text-foreground/60 mb-1">No posts from this day yet.</p>
          <p className="text-xs text-foreground/40">
            Check back next year — something you post today may appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="block rounded-xl bg-vocl-surface-dark border border-white/5 hover:border-white/10 transition-colors p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-vocl-accent/15 text-vocl-accent text-xs font-medium">
                  <IconRefresh size={11} />
                  {post.yearsAgo} {post.yearsAgo === 1 ? "year" : "years"} ago
                </span>
                <span className="text-xs text-foreground/40">
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              <div className="flex items-start gap-3">
                {thumbnail(post) ? (
                  <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0 bg-black/20">
                    <Image src={thumbnail(post)!} alt="" fill className="object-cover" sizes="80px" />
                  </div>
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/80 line-clamp-4">
                    {snippet(post) || "View this post"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50">
                    <span className="inline-flex items-center gap-1">
                      <IconHeart size={12} /> {post.likeCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IconMessage size={12} /> {post.commentCount}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
