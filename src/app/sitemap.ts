import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getComparisons } from "@/lib/comparisons";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://bevocl.com";

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
    // Comparison pages (static marketing content).
    {
      url: `${APP_URL}/vs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    ...getComparisons().map((c) => ({
      url: `${APP_URL}/vs/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  try {
    const supabase = createAdminClient();

    // Public posts: index only Public posts (not sensitive, not opted out) from
    // authors who allow the public web + search indexing and aren't restricted.
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

    // Public profiles → /profile/[username] (public, indexing-allowed, not restricted).
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("username, updated_at, allow_search_indexing, lock_status")
      .eq("is_profile_public", true)
      .order("created_at", { ascending: false })
      .limit(5000);

    for (const p of (profiles ?? []) as Array<{
      username: string;
      updated_at: string | null;
      allow_search_indexing: boolean | null;
      lock_status: string | null;
    }>) {
      if (p.allow_search_indexing === false) continue;
      if (p.lock_status === "restricted" || p.lock_status === "banned") continue;
      entries.push({
        url: `${APP_URL}/profile/${p.username}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.6,
      });
    }

    // Public tag pages → /discover/tag/[name]. Only tags with published posts;
    // the tag page itself still applies the full public-visibility filters.
    const { data: tags } = await (supabase as any)
      .from("tags")
      .select("name, post_count, created_at")
      .gt("post_count", 0)
      .order("post_count", { ascending: false })
      .limit(1000);

    for (const t of (tags ?? []) as Array<{
      name: string;
      post_count: number | null;
      created_at: string | null;
    }>) {
      if (!t.name) continue;
      entries.push({
        url: `${APP_URL}/discover/tag/${encodeURIComponent(t.name)}`,
        lastModified: t.created_at ? new Date(t.created_at) : new Date(),
        changeFrequency: "daily",
        priority: 0.5,
      });
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }

  return entries;
}
