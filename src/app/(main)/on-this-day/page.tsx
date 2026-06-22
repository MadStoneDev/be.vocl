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
        <IconLoader2 size={32} className="animate-spin text-vocl-primary" />
      </div>
    );
  }

  return (
    <div className="py-6 px-4 max-w-2xl mx-auto">
      <title>On this day | be.vocl</title>
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 type-meta uppercase tracking-wide text-foreground/55 hover:text-vocl-primary mb-5 transition-colors"
      >
        <IconArrowLeft size={15} />
        Back to feed
      </Link>

      <header className="mb-6 border-b border-vocl-border pb-5">
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          From the Archives
        </span>
        <h1 className="type-display-lg text-foreground mt-1 flex items-center gap-3">
          <IconCalendarEvent size={28} className="text-vocl-primary flex-shrink-0" />
          On This Day
        </h1>
        <p className="type-body text-foreground/55 mt-1">
          Your posts from {today} in previous years.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="border-t border-vocl-border py-12 text-center">
          <IconCalendarEvent size={40} className="mx-auto text-foreground/20 mb-3" />
          <p className="type-body text-foreground/60 mb-1">No posts from this day yet.</p>
          <p className="type-meta text-foreground/40">
            Check back next year — something you post today may appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-vocl-border">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="group block py-5 first:pt-0"
            >
              <div className="flex items-center gap-2 mb-2 type-meta uppercase tracking-wide">
                <span className="inline-flex items-center gap-1 text-vocl-primary font-semibold">
                  <IconRefresh size={11} />
                  {post.yearsAgo} {post.yearsAgo === 1 ? "year" : "years"} ago
                </span>
                <span className="text-foreground/40 normal-case tracking-normal">
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
                  <p className="type-heading text-foreground line-clamp-3 group-hover:text-vocl-primary transition-colors">
                    {snippet(post) || "View this post"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 type-meta text-foreground/50">
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
