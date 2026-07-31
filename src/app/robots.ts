import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated / private app surfaces should never be indexed. Public
        // profiles at /profile/[username] ARE crawlable (they server-render a
        // public view for logged-out visitors); private ones carry a per-page
        // noindex. Public reach also spans per-post (/post/[id]) and /discover.
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
          "/thread/",
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL,
  };
}
