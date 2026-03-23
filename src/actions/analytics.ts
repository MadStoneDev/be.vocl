"use server";

import { requireAuth } from "./shared/auth";

interface PostAnalyticsResult {
  success: boolean;
  error?: string;
  topPosts?: TopPost[];
  engagementOverTime?: EngagementDay[];
  topTags?: TagAnalytics[];
  postTypeBreakdown?: PostTypeCount[];
}

interface TopPost {
  id: string;
  post_type: string;
  content: any;
  created_at: string;
  like_count: number;
  comment_count: number;
  reblog_count: number;
  tags: string[] | null;
  engagement: number;
}

interface EngagementDay {
  date: string;
  likes: number;
  comments: number;
  reblogs: number;
}

interface TagAnalytics {
  tag: string;
  postCount: number;
  avgLikes: number;
  avgComments: number;
  avgReblogs: number;
  avgEngagement: number;
}

interface PostTypeCount {
  postType: string;
  count: number;
  percentage: number;
}

interface FollowerCountResult {
  success: boolean;
  error?: string;
  followerCount?: number;
}

export async function getPostAnalytics(
  timeRange: "7d" | "30d" | "90d"
): Promise<PostAnalyticsResult> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    // Fetch all user posts within time range
    const { data: posts, error } = await (supabase as any)
      .from("posts")
      .select(
        "id, post_type, content, created_at, like_count, comment_count, reblog_count, tags"
      )
      .eq("author_id", user.id)
      .eq("is_deleted", false)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const allPosts = (posts || []) as any[];

    // Top 10 posts by engagement
    const topPosts: TopPost[] = allPosts
      .map((p: any) => ({
        id: p.id,
        post_type: p.post_type,
        content: p.content,
        created_at: p.created_at,
        like_count: p.like_count || 0,
        comment_count: p.comment_count || 0,
        reblog_count: p.reblog_count || 0,
        tags: p.tags,
        engagement:
          (p.like_count || 0) + (p.comment_count || 0) + (p.reblog_count || 0),
      }))
      .sort((a: TopPost, b: TopPost) => b.engagement - a.engagement)
      .slice(0, 10);

    // Engagement over time grouped by day
    const engagementMap = new Map<
      string,
      { likes: number; comments: number; reblogs: number }
    >();

    // Initialize all days in range
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      engagementMap.set(key, { likes: 0, comments: 0, reblogs: 0 });
    }

    for (const p of allPosts) {
      const day = p.created_at.split("T")[0];
      const existing = engagementMap.get(day);
      if (existing) {
        existing.likes += p.like_count || 0;
        existing.comments += p.comment_count || 0;
        existing.reblogs += p.reblog_count || 0;
      }
    }

    const engagementOverTime: EngagementDay[] = Array.from(
      engagementMap.entries()
    )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    // Top tags with avg engagement
    const tagMap = new Map<
      string,
      { count: number; likes: number; comments: number; reblogs: number }
    >();

    for (const p of allPosts) {
      if (p.tags && Array.isArray(p.tags)) {
        for (const tag of p.tags) {
          const existing = tagMap.get(tag) || {
            count: 0,
            likes: 0,
            comments: 0,
            reblogs: 0,
          };
          existing.count += 1;
          existing.likes += p.like_count || 0;
          existing.comments += p.comment_count || 0;
          existing.reblogs += p.reblog_count || 0;
          tagMap.set(tag, existing);
        }
      }
    }

    const topTags: TagAnalytics[] = Array.from(tagMap.entries())
      .map(([tag, stats]) => ({
        tag,
        postCount: stats.count,
        avgLikes: Math.round((stats.likes / stats.count) * 10) / 10,
        avgComments: Math.round((stats.comments / stats.count) * 10) / 10,
        avgReblogs: Math.round((stats.reblogs / stats.count) * 10) / 10,
        avgEngagement:
          Math.round(
            ((stats.likes + stats.comments + stats.reblogs) / stats.count) * 10
          ) / 10,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 20);

    // Post type breakdown
    const typeMap = new Map<string, number>();
    for (const p of allPosts) {
      const t = p.post_type || "text";
      typeMap.set(t, (typeMap.get(t) || 0) + 1);
    }

    const total = allPosts.length || 1;
    const postTypeBreakdown: PostTypeCount[] = Array.from(typeMap.entries())
      .map(([postType, count]) => ({
        postType,
        count,
        percentage: Math.round((count / total) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      success: true,
      topPosts,
      engagementOverTime,
      topTags,
      postTypeBreakdown,
    };
  } catch (err) {
    console.error("getPostAnalytics error:", err);
    return { success: false, error: "Failed to fetch analytics" };
  }
}

interface PostDetailAnalyticsResult {
  success: boolean;
  data?: {
    post: { id: string; postType: string; content: any; createdAt: string };
    totalLikes: number;
    totalComments: number;
    totalReblogs: number;
    engagementOverTime: Array<{
      date: string;
      likes: number;
      comments: number;
      reblogs: number;
    }>;
    topCommenters: Array<{ username: string; commentCount: number }>;
  };
  error?: string;
}

export async function getPostDetailAnalytics(
  postId: string
): Promise<PostDetailAnalyticsResult> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch the post and verify ownership
    const { data: post, error: postError } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content, created_at, author_id, like_count, comment_count, reblog_count")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return { success: false, error: "Post not found" };
    }

    if (post.author_id !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Fetch likes grouped by day
    const { data: likes } = await (supabase as any)
      .from("likes")
      .select("created_at")
      .eq("post_id", postId);

    // Fetch comments with user info grouped by day
    const { data: comments } = await (supabase as any)
      .from("comments")
      .select("created_at, user_id, profiles:user_id(username)")
      .eq("post_id", postId);

    // Fetch reblogs (posts where original_post_id = this post)
    const { data: reblogs } = await (supabase as any)
      .from("posts")
      .select("created_at")
      .eq("original_post_id", postId);

    // Build engagement over time
    const dayMap = new Map<
      string,
      { likes: number; comments: number; reblogs: number }
    >();

    for (const l of likes || []) {
      if (!l.created_at) continue;
      const day = l.created_at.split("T")[0];
      const entry = dayMap.get(day) || { likes: 0, comments: 0, reblogs: 0 };
      entry.likes += 1;
      dayMap.set(day, entry);
    }

    for (const c of comments || []) {
      if (!c.created_at) continue;
      const day = c.created_at.split("T")[0];
      const entry = dayMap.get(day) || { likes: 0, comments: 0, reblogs: 0 };
      entry.comments += 1;
      dayMap.set(day, entry);
    }

    for (const r of reblogs || []) {
      if (!r.created_at) continue;
      const day = r.created_at.split("T")[0];
      const entry = dayMap.get(day) || { likes: 0, comments: 0, reblogs: 0 };
      entry.reblogs += 1;
      dayMap.set(day, entry);
    }

    const engagementOverTime = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, stats]) => ({ date, ...stats }));

    // Top 5 commenters
    const commenterMap = new Map<string, number>();
    for (const c of comments || []) {
      const username =
        c.profiles?.username || "unknown";
      commenterMap.set(username, (commenterMap.get(username) || 0) + 1);
    }

    const topCommenters = Array.from(commenterMap.entries())
      .map(([username, commentCount]) => ({ username, commentCount }))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, 5);

    return {
      success: true,
      data: {
        post: {
          id: post.id,
          postType: post.post_type,
          content: post.content,
          createdAt: post.created_at,
        },
        totalLikes: post.like_count || 0,
        totalComments: post.comment_count || 0,
        totalReblogs: post.reblog_count || 0,
        engagementOverTime,
        topCommenters,
      },
    };
  } catch (err) {
    console.error("getPostDetailAnalytics error:", err);
    return { success: false, error: "Failed to fetch post analytics" };
  }
}

export async function getFollowerCount(): Promise<FollowerCountResult> {
  try {
    const { user, supabase } = await requireAuth();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { count, error } = await (supabase as any)
      .from("follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, followerCount: count || 0 };
  } catch (err) {
    console.error("getFollowerCount error:", err);
    return { success: false, error: "Failed to fetch follower count" };
  }
}
