"use server";

import { createClient } from "@/lib/supabase/server";

export interface OnThisDayPost {
  id: string;
  yearsAgo: number;
  createdAt: string;
  postType: string;
  content: any;
  likeCount: number;
  commentCount: number;
}

/**
 * Return the current user's own posts that were created on this month-day in prior years.
 * Groups results by how many years ago they were posted (1, 2, 3…).
 */
export async function getOnThisDay(): Promise<{
  success: boolean;
  posts?: OnThisDayPost[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Grab all published posts for this user (we filter by month/day in JS).
    // For heavy users this could be a lot; cap and rely on the index over author_id.
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id, post_type, content, created_at, like_count, comment_count")
      .eq("author_id", user.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) return { success: false, error: error.message };

    const today = new Date();
    const month = today.getUTCMonth();
    const day = today.getUTCDate();
    const thisYear = today.getUTCFullYear();

    const matches: OnThisDayPost[] = [];
    for (const p of (data || []) as any[]) {
      const d = new Date(p.created_at);
      if (d.getUTCMonth() !== month || d.getUTCDate() !== day) continue;
      const yearsAgo = thisYear - d.getUTCFullYear();
      if (yearsAgo < 1) continue; // today doesn't count
      matches.push({
        id: p.id,
        yearsAgo,
        createdAt: p.created_at,
        postType: p.post_type,
        content: p.content,
        likeCount: p.like_count || 0,
        commentCount: p.comment_count || 0,
      });
    }

    matches.sort((a, b) => a.yearsAgo - b.yearsAgo);
    return { success: true, posts: matches };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
