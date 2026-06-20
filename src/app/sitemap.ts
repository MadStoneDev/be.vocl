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
  ];

  try {
    const supabase = createAdminClient();
    // Only list profiles that are discoverable AND allow search indexing,
    // and are not restricted/banned.
    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("username, updated_at, lock_status")
      .eq("is_discoverable", true)
      .eq("allow_search_indexing", true)
      .limit(5000);

    for (const p of (profiles ?? []) as Array<{
      username: string;
      updated_at: string | null;
      lock_status: string | null;
    }>) {
      if (!p.username) continue;
      if (p.lock_status === "restricted" || p.lock_status === "banned") continue;
      const lastModified = p.updated_at ? new Date(p.updated_at) : new Date();
      entries.push({
        url: `${APP_URL}/u/${p.username}`,
        lastModified,
        changeFrequency: "daily",
        priority: 0.6,
      });
      entries.push({
        url: `${APP_URL}/u/${p.username}/archive`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  } catch (error) {
    console.error("Sitemap generation error:", error);
  }

  return entries;
}
