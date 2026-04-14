"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  IconCalendarEvent,
  IconChevronRight,
  IconHeart,
  IconMessage,
} from "@tabler/icons-react";
import { getOnThisDay, type OnThisDayPost } from "@/actions/on-this-day";

function snippet(post: OnThisDayPost): string {
  const c = post.content || {};
  switch (post.postType) {
    case "text": {
      const raw = c.plain || c.html || "";
      return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
    }
    case "image":
    case "gallery":
      return "Image post";
    case "video":
      return "Video post";
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

export function OnThisDayCard() {
  const [posts, setPosts] = useState<OnThisDayPost[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (typeof window !== "undefined") {
      const key = `vocl:on-this-day-dismissed:${today}`;
      if (sessionStorage.getItem(key)) {
        setDismissed(true);
      }
    }
    getOnThisDay().then((r) => {
      if (r.success) setPosts(r.posts || []);
      setLoaded(true);
    });
  }, []);

  function dismiss() {
    const today = new Date().toISOString().slice(0, 10);
    sessionStorage.setItem(`vocl:on-this-day-dismissed:${today}`, "1");
    setDismissed(true);
  }

  if (!loaded || dismissed || posts.length === 0) return null;

  const firstPost = posts[0];

  return (
    <div className="mb-4 rounded-xl bg-gradient-to-br from-vocl-accent/15 to-vocl-accent/5 border border-vocl-accent/20 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <IconCalendarEvent size={20} className="text-vocl-accent" />
          <h3 className="text-sm font-semibold text-foreground">On this day</h3>
        </div>
        <button
          onClick={dismiss}
          className="text-xs text-foreground/40 hover:text-foreground/70"
        >
          Hide
        </button>
      </div>

      <Link
        href={`/post/${firstPost.id}`}
        className="block group rounded-lg bg-black/5 hover:bg-black/10 transition-colors p-3"
      >
        <div className="flex items-start gap-3">
          {thumbnail(firstPost) ? (
            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-black/20">
              <Image src={thumbnail(firstPost)!} alt="" fill className="object-cover" sizes="64px" />
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-vocl-accent mb-0.5">
              {firstPost.yearsAgo} {firstPost.yearsAgo === 1 ? "year" : "years"} ago
            </p>
            <p className="text-sm text-foreground line-clamp-3">
              {snippet(firstPost) || "View this post"}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-foreground/50">
              <span className="inline-flex items-center gap-1">
                <IconHeart size={12} />
                {firstPost.likeCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <IconMessage size={12} />
                {firstPost.commentCount}
              </span>
            </div>
          </div>
          <IconChevronRight size={16} className="text-foreground/30 group-hover:text-foreground/70 flex-shrink-0 mt-1" />
        </div>
      </Link>

      {posts.length > 1 && (
        <Link
          href="/on-this-day"
          className="inline-block mt-2 text-xs text-vocl-accent hover:underline"
        >
          See {posts.length - 1} more from today's memories →
        </Link>
      )}
    </div>
  );
}
