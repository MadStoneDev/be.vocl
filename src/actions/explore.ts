"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get explore page data: trending tags, popular tags, rising creators
 */
export async function getExploreData(): Promise<{
  success: boolean;
  trendingTags?: Array<{ id: string; name: string; postCount: number }>;
  popularTags?: Array<{ id: string; name: string; totalPosts: number }>;
  risingCreators?: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    followerCount: number;
    postCount: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Parallel fetch all explore data
    const [trendingResult, popularResult, creatorsResult] = await Promise.all([
      // Trending tags: most used in last 24h
      (supabase as any)
        .from("post_tags")
        .select("tag_id, tags!inner(id, name)")
        .gte("created_at", oneDayAgo.toISOString()),

      // Popular tags: highest total post count
      (supabase as any)
        .from("tags")
        .select("id, name, post_count")
        .order("post_count", { ascending: false })
        .limit(20),

      // Rising creators: users who joined in last 30 days with engagement
      // Get recent users with their post counts
      (supabase as any)
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50),
    ]);

    // Process trending tags - count occurrences
    const tagCounts = new Map<string, { id: string; name: string; count: number }>();
    for (const pt of trendingResult.data || []) {
      const tag = pt.tags;
      if (!tag) continue;
      const existing = tagCounts.get(tag.id);
      if (existing) {
        existing.count++;
      } else {
        tagCounts.set(tag.id, { id: tag.id, name: tag.name, count: 1 });
      }
    }
    const trendingTags = [...tagCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 15)
      .map(t => ({ id: t.id, name: t.name, postCount: t.count }));

    // Process popular tags
    const popularTags = (popularResult.data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      totalPosts: t.post_count || 0,
    }));

    // Process rising creators - get follower counts
    const creatorIds = (creatorsResult.data || []).map((c: any) => c.id);
    let risingCreators: any[] = [];

    if (creatorIds.length > 0) {
      // Get post counts and follower counts for these creators
      const [postCounts, followerCounts] = await Promise.all([
        (supabase as any)
          .from("posts")
          .select("author_id")
          .in("author_id", creatorIds)
          .eq("status", "published"),
        (supabase as any)
          .from("follows")
          .select("following_id")
          .in("following_id", creatorIds),
      ]);

      const postCountMap = new Map<string, number>();
      for (const p of postCounts.data || []) {
        postCountMap.set(p.author_id, (postCountMap.get(p.author_id) || 0) + 1);
      }

      const followerCountMap = new Map<string, number>();
      for (const f of followerCounts.data || []) {
        followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1);
      }

      risingCreators = (creatorsResult.data || [])
        .map((c: any) => ({
          id: c.id,
          username: c.username,
          displayName: c.display_name,
          avatarUrl: c.avatar_url,
          bio: c.bio,
          followerCount: followerCountMap.get(c.id) || 0,
          postCount: postCountMap.get(c.id) || 0,
        }))
        .filter((c: any) => c.postCount > 0) // Must have at least 1 post
        .sort((a: any, b: any) => b.followerCount - a.followerCount || b.postCount - a.postCount)
        .slice(0, 10);
    }

    return { success: true, trendingTags, popularTags, risingCreators };
  } catch (error) {
    console.error("Get explore data error:", error);
    return { success: false, error: "Failed to load explore data" };
  }
}
