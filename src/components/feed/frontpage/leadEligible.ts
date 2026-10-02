import type { FeedPost } from "../FeedList";

// Pure lead-eligibility rule, deliberately in its own module (NO "use client")
// so it can be called from BOTH the client Front Page (useFeedLayout) and the
// server-rendered logged-out homepage (app/page.tsx). Importing it from a
// "use client" module into a Server Component yields a client-reference proxy,
// not a callable function — which 500s the homepage render.

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
