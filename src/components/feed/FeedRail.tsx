"use client";

import Link from "next/link";
import { TimeAgo } from "@/components/ui";

interface RailPost {
  id: string;
  threadId?: string | null;
  contentType: string;
  content: {
    text?: string;
    html?: string;
    isEssay?: boolean;
    isVoiceNote?: boolean;
    spotifyData?: { name?: string; artist?: string } | null;
  };
  author: { username: string };
  timestamp: string;
}

function hrefOf(p: RailPost): string {
  return p.threadId ? `/thread/${p.threadId}` : `/post/${p.id}`;
}
function strip(html?: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function clamp(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}

/**
 * The logged-in feed's right rail (artboard 01): a Listen shelf and a
 * Notes · Briefs column, derived from the same feed posts — no extra fetch.
 * Rendered only where there's room (2xl); returns null when there's nothing.
 */
export function FeedRail({ posts }: { posts: RailPost[] }) {
  const listen = posts.filter((p) => p.contentType === "audio").slice(0, 3);
  const briefs = posts.filter((p) => p.contentType === "text" && !p.content?.isEssay).slice(0, 4);

  if (listen.length === 0 && briefs.length === 0) return null;

  return (
    <div className="sticky top-4 space-y-8">
      {listen.length > 0 && (
        <div>
          <div className="slug border-b border-rule pb-3 text-accent">Listen</div>
          {listen.map((p) => {
            const title = p.content?.spotifyData?.name || (p.content?.isVoiceNote ? "Voice note" : "Audio");
            const sub = p.content?.spotifyData?.artist || `@${p.author.username}`;
            return (
              <Link key={p.id} href={hrefOf(p)} className="group flex items-center gap-3 border-b border-rule py-3">
                <div className="ph-image h-12 w-12 flex-none" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="type-heading truncate text-ink transition-colors group-hover:text-accent">{title}</div>
                  <div className="byline mt-0.5 truncate text-meta">{sub}</div>
                </div>
                <span aria-hidden="true" className="ml-auto text-lg leading-none text-ink">▸</span>
              </Link>
            );
          })}
        </div>
      )}

      {briefs.length > 0 && (
        <div>
          <div className="slug border-b border-rule pb-3 text-meta">Notes · Briefs</div>
          {briefs.map((p) => {
            const body = p.content?.text || strip(p.content?.html);
            return (
              <Link key={p.id} href={hrefOf(p)} className="block border-b border-rule py-3 transition-colors hover:text-accent">
                <p className="editorial-body text-[0.95rem] text-ink-secondary">{clamp(body, 120)}</p>
                <span className="byline mt-1.5 block text-meta">
                  {p.author.username} · <TimeAgo iso={p.timestamp} />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
