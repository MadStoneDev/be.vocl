import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated / private app surfaces should never be indexed.
        // Profiles (/u) and the in-app profile are members-only; public reach is
        // per-post (/post/[id]) plus the public /discover page.
        disallow: [
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
          "/u/",
          "/profile/",
          "/thread/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
