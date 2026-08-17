import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

// Authenticated / private app surfaces should never be crawled. Public profiles
// (/profile/[username]), posts (/post/[id]), /discover and /vs are crawlable.
const DISALLOW = [
  "/api/",
  "/feed",
  "/settings",
  "/messages",
  "/notifications",
  "/bookmarks",
  "/admin",
  "/login",
  "/signup",
  "/onboarding",
  "/account-status",
  "/thread/",
];

// Answer/generative-engine crawlers we deliberately welcome on public surfaces.
// be.vocl's "mature is never public" rule makes this low-risk, and being cited
// by these engines is good for discovery. To opt out of AI *training* while
// keeping *answering*, move e.g. GPTBot / CCBot / Google-Extended to their own
// rule with `disallow: "/"`.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
