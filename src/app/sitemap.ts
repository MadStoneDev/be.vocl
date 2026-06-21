import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: `${APP_URL}/discover`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  try {
    const supabase = createAdminClient();

    // Profiles are members-only and never indexed, so they are NOT in the sitemap.
    // Public discoverability happens at the post level: index only Public posts
    // (not sensitive, not opted out) from authors who allow the public web + search
    // indexing and are not restricted/banned.
    const { data: posts } = await (supabase as any)
      .from("posts")
      .select(
        "id, updated_at, created_at, author:author_id ( is_discoverable, allow_search_indexing, lock_status )"
      )
      .eq("status", "published")
      .eq("moderation_status", "approved")
      .eq("is_sensitive", false)
      .eq("exclude_from_public", false)
      .order("created_at", { ascending: false })
      .limit(5000);

    for (const p of (posts ?? []) as Array<{
      id: string;
      updated_at: string | null;
      created_at: string | null;
      author: {
        is_discoverable: boolean | null;
        allow_search_indexing: boolean | null;
        lock_status: string | null;
      } | null;
    }>) {
      const a = p.author;
      if (!a) continue;
      if (a.is_discoverable === false || a.allow_search_indexing === false) continue;
      if (a.lock_status === "restricted" || a.lock_status === "banned") continue;
      entries.push({
        url: `${APP_URL}/post/${p.id}`,
        lastModified: p.updated_at
          ? new Date(p.updated_at)
          : p.created_at
            ? new Date(p.created_at)
            : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }

  return entries;
}
