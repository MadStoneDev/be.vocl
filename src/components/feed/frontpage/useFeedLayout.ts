"use client";

import { useMemo } from "react";
import type { FeedPost } from "../FeedList";

export type Prominence = "lead" | "feature" | "standard";

export interface FeedLayout {
  lead: FeedPost | null;
  features: FeedPost[]; // up to 2, beside the lead
  standards: FeedPost[]; // the rest, in feed (recency) order
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

/** Non-empty caption text (HTML tags stripped, whitespace trimmed). */
function hasCaption(p: FeedPost): boolean {
  return (p.content.captionHtml ?? "").replace(/<[^>]*>/g, "").trim().length > 0;
}

/**
 * The link-preview card a shared-link post would render as a lead (mirrors the
 * routing in FrontPageTile: a non-essay text post with a resolved preview). A
 * plain text note / essay returns null — it leads on its own words.
 */
function linkCardFor(p: FeedPost) {
  if (p.contentType !== "text" || p.content.isEssay) return null;
  const lp = p.content.linkPreviews;
  return lp && lp.length > 0 ? lp[0] : null;
}

/**
 * Reads well as the lead headline:
 *  - a text post (plain note or essay) — always;
 *  - a shared-link post only if its preview card resolved a title (a failed /
 *    titleless preview isn't eligible — an image is a bonus, not required);
 *  - an image or gallery post with a non-empty caption;
 *  - video / audio / poll / ask never lead.
 */
export function leadEligible(p: FeedPost): boolean {
  switch (p.contentType) {
    case "image":
    case "gallery":
      return hasCaption(p);
    case "text": {
      const card = linkCardFor(p);
      // A link share leads only when the preview gave us a real title.
      if (card) return (card.title ?? "").trim().length > 0;
      return true;
    }
    default:
      return false;
  }
}

/**
 * Lay the front page out in the feed's order (same sorted list the Reader uses —
 * newest first). The lead is the newest post that reads as a headline story
 * (see leadEligible), falling back to the newest post of any type when none
 * qualify. The lead is simply pulled out of the list; the two features are
 * the next two remaining and "More stories" is the rest, all in strict date
 * order. Nothing is dropped or duplicated (lead + features + standards partition
 * the array).
 */
export function useFeedLayout(posts: FeedPost[]): FeedLayout {
  return useMemo(() => {
    if (posts.length === 0) return { lead: null, features: [], standards: [] };
    const lead = posts.find(leadEligible) ?? posts[0];
    const rest = posts.filter((p) => p.id !== lead.id);
    return { lead, features: rest.slice(0, 2), standards: rest.slice(2) };
  }, [posts]);
}
