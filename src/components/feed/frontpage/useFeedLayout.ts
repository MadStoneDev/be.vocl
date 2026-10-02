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

/**
 * Lay the front page out STRICTLY in the feed's order (same sorted list the
 * Reader uses — newest first). Fill slots in sequence: lead = first post, the
 * two features beside it = next two, and every remaining post flows into the
 * "More stories" river in order. No scoring, no type/engagement reshuffle, no
 * promotion that reorders the river, and no post is ever dropped or duplicated
 * (lead + features + standards partition the array).
 */
export function useFeedLayout(posts: FeedPost[]): FeedLayout {
  return useMemo(() => {
    if (posts.length === 0) return { lead: null, features: [], standards: [] };
    return {
      lead: posts[0],
      features: posts.slice(1, 3),
      standards: posts.slice(3),
    };
  }, [posts]);
}
