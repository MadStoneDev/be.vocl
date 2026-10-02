"use client";

import { useMemo } from "react";
import type { FeedPost } from "../FeedList";
import { leadEligible } from "./leadEligible";

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
