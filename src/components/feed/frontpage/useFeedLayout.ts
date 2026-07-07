"use client";

import { useMemo, useState } from "react";
import type { FeedPost } from "../FeedList";

// Hero candidates come from the first page of posts only, so load-more
// appends can never crown a different lead and reshuffle the top of the page
// while the reader is scrolled down the river.
const HERO_POOL_SIZE = 20;

export type Prominence = "lead" | "feature" | "standard";

export interface FeedLayout {
  lead: FeedPost | null;
  features: FeedPost[]; // up to 2, beside the lead
  standards: FeedPost[]; // the rest, in feed (recency) order
}

function hoursSince(ts: string, now: number): number {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return 24; // neutral if the timestamp isn't a parseable date
  return Math.max(0, (now - t) / 3_600_000);
}

export function postHasMedia(p: FeedPost): boolean {
  return (
    p.contentType === "image" ||
    p.contentType === "gallery" ||
    p.contentType === "video" ||
    !!p.content.imageUrl ||
    (p.content.imageUrls?.length ?? 0) > 0 ||
    !!p.content.videoThumbnailUrl
  );
}

/** Prominence score — the "algorithmic editor". Higher = more prominent. */
function score(p: FeedPost, now: number): number {
  const recency = Math.exp(-hoursSince(p.timestamp, now) / 18); // decays over ~a day
  const engage = Math.log1p(
    p.stats.likes + 2 * p.stats.comments + 3 * p.stats.reblogs, // reblogs weighted highest
  );
  const mediaBoost = postHasMedia(p) ? 1.25 : 1;
  const essayBoost = p.content.isEssay ? 1.2 : 1;
  // bare reblogs (no added commentary) are demoted
  const reblogPenalty = p.isReblog && !p.reblogCommentHtml ? 0.85 : 1;
  return (engage + 0.5) * recency * mediaBoost * essayBoost * reblogPenalty;
}

/** Can this post anchor the page? Needs a visual or a title, and must be SFW. */
function leadEligible(p: FeedPost): boolean {
  if (p.isSensitive) return false; // a blurred hero is a dead hero
  if (p.content.isEssay) return true;
  if (postHasMedia(p)) return true;
  // text with enough substance can still lead
  return (p.content.text?.trim().length ?? 0) > 40;
}

/**
 * Curated top (lead + 2 features by score, drawn from the first page) over a
 * recency-ordered river of standards. Deterministic for a given posts array:
 * the scoring clock is frozen per mount.
 */
export function useFeedLayout(posts: FeedPost[]): FeedLayout {
  // Scoring time is frozen per mount: recency decay drifting between renders
  // (load more, refetch) must not change which posts anchor the page.
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    if (posts.length === 0) return { lead: null, features: [], standards: [] };

    const byScore = posts.slice(0, HERO_POOL_SIZE).sort((a, b) => score(b, now) - score(a, now));

    const lead =
      byScore.find(leadEligible) ?? byScore[0] ?? null;

    const features: FeedPost[] = [];
    for (const p of byScore) {
      if (features.length >= 2) break;
      if (p.id === lead?.id) continue;
      // keep variety: don't let the lead's author own a feature slot too
      if (lead && p.author.username === lead.author.username) continue;
      features.push(p);
    }
    // fallback if author-dedupe starved the feature slots
    if (features.length < 2) {
      for (const p of byScore) {
        if (features.length >= 2) break;
        if (p.id === lead?.id) continue;
        if (features.some((f) => f.id === p.id)) continue;
        features.push(p);
      }
    }

    const promoted = new Set<string>([lead?.id, ...features.map((f) => f.id)].filter(Boolean) as string[]);
    const standards = posts.filter((p) => !promoted.has(p.id)); // original (recency) order

    return { lead, features, standards };
  }, [posts, now]);
}
