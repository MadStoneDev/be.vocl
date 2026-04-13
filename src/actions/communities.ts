"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  memberCount: number;
  postCount: number;
  nsfw: boolean;
  visibility: "public" | "restricted" | "private";
  joinPolicy: "open" | "request" | "invite_only";
  isMember?: boolean;
  myRole?: "member" | "moderator" | "owner" | null;
  createdAt: string;
}

function toSummary(row: any, isMember = false, myRole: any = null): CommunitySummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    iconUrl: row.icon_url,
    bannerUrl: row.banner_url,
    memberCount: row.member_count ?? 0,
    postCount: row.post_count ?? 0,
    nsfw: row.nsfw ?? false,
    visibility: row.visibility,
    joinPolicy: row.join_policy,
    isMember,
    myRole,
    createdAt: row.created_at,
  };
}

export async function createCommunity(input: {
  slug: string;
  name: string;
  description?: string;
  nsfw?: boolean;
}): Promise<{ success: boolean; community?: CommunitySummary; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(slug)) {
      return { success: false, error: "Slug must be 3–32 chars, lowercase letters, numbers, - or _" };
    }
    if (input.name.trim().length < 2 || input.name.trim().length > 60) {
      return { success: false, error: "Name must be 2–60 characters" };
    }

    const { data, error } = await (supabase as any)
      .from("communities")
      .insert({
        slug,
        name: input.name.trim(),
        description: input.description?.trim() || null,
        nsfw: !!input.nsfw,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") return { success: false, error: "Slug already taken" };
      return { success: false, error: error.message };
    }

    revalidatePath("/communities");
    return { success: true, community: toSummary(data, true, "owner") };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to create community" };
  }
}

export async function getCommunity(slug: string): Promise<{ success: boolean; community?: CommunitySummary; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: row, error } = await (supabase as any)
      .from("communities")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !row) return { success: false, error: "Community not found" };

    let isMember = false;
    let myRole: any = null;
    if (user) {
      const { data: m } = await (supabase as any)
        .from("community_members")
        .select("role")
        .eq("community_id", row.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (m) {
        isMember = true;
        myRole = m.role;
      }
    }

    return { success: true, community: toSummary(row, isMember, myRole) };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to fetch community" };
  }
}

export async function listCommunities(opts?: {
  search?: string;
  limit?: number;
  offset?: number;
  joinedOnly?: boolean;
}): Promise<{ success: boolean; communities?: CommunitySummary[]; hasMore?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const limit = opts?.limit ?? 24;
    const offset = opts?.offset ?? 0;

    let myCommunityIds = new Set<string>();
    if (user) {
      const { data: mine } = await (supabase as any)
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);
      myCommunityIds = new Set((mine || []).map((m: any) => m.community_id));
    }

    if (opts?.joinedOnly) {
      if (!user) return { success: true, communities: [], hasMore: false };
      if (myCommunityIds.size === 0) return { success: true, communities: [], hasMore: false };

      let query = (supabase as any)
        .from("communities")
        .select("*")
        .in("id", Array.from(myCommunityIds))
        .order("member_count", { ascending: false })
        .range(offset, offset + limit);
      if (opts?.search) query = query.ilike("name", `%${opts.search}%`);

      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      const rows = (data || []) as any[];
      const hasMore = rows.length > limit;
      const sliced = hasMore ? rows.slice(0, limit) : rows;
      return {
        success: true,
        communities: sliced.map((r) => toSummary(r, true)),
        hasMore,
      };
    }

    let query = (supabase as any)
      .from("communities")
      .select("*")
      .eq("visibility", "public")
      .order("member_count", { ascending: false })
      .range(offset, offset + limit);
    if (opts?.search) query = query.ilike("name", `%${opts.search}%`);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    const rows = (data || []) as any[];
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    return {
      success: true,
      communities: sliced.map((r) => toSummary(r, myCommunityIds.has(r.id))),
      hasMore,
    };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to list communities" };
  }
}

export async function joinCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("community_members")
      .insert({ community_id: communityId, user_id: user.id, role: "member" });

    if (error && error.code !== "23505") return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function leaveCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", user.id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getMyCommunities(): Promise<{ success: boolean; communities?: CommunitySummary[]; error?: string }> {
  return listCommunities({ joinedOnly: true, limit: 100 });
}

export async function crossPostToCommunities(
  postId: string,
  communityIds: string[]
): Promise<{ success: boolean; added?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };
    if (communityIds.length === 0) return { success: true, added: 0 };

    const rows = communityIds.map((cid) => ({
      community_id: cid,
      post_id: postId,
      added_by: user.id,
    }));

    const { error, count } = await (supabase as any)
      .from("community_posts")
      .insert(rows, { count: "exact" });
    if (error) return { success: false, error: error.message };

    return { success: true, added: count ?? rows.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeFromCommunity(communityId: string, postId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("community_posts")
      .delete()
      .eq("community_id", communityId)
      .eq("post_id", postId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getCommunityFeed(
  slug: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ success: boolean; posts?: any[]; community?: CommunitySummary; hasMore?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? 0;

    const communityResult = await getCommunity(slug);
    if (!communityResult.success || !communityResult.community) {
      return { success: false, error: communityResult.error || "Not found" };
    }
    const community = communityResult.community;

    const { data: links, error: linksErr } = await (supabase as any)
      .from("community_posts")
      .select("post_id, added_at, pinned")
      .eq("community_id", community.id)
      .order("pinned", { ascending: false })
      .order("added_at", { ascending: false })
      .range(offset, offset + limit);
    if (linksErr) return { success: false, error: linksErr.message };

    const rows = (links || []) as any[];
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    if (sliced.length === 0) return { success: true, posts: [], community, hasMore: false };

    const postIds = sliced.map((l) => l.post_id);
    const { data: posts, error: postsErr } = await (supabase as any)
      .from("posts")
      .select(`
        id, author_id, post_type, content, is_sensitive, is_pinned, created_at, published_at,
        like_count, comment_count, reblog_count,
        author:profiles!posts_author_id_fkey (id, username, display_name, avatar_url, role)
      `)
      .in("id", postIds)
      .eq("status", "published");
    if (postsErr) return { success: false, error: postsErr.message };

    let userLikes = new Set<string>();
    let userBookmarks = new Set<string>();
    if (user) {
      const [likesRes, bookmarksRes] = await Promise.all([
        (supabase as any).from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds),
        (supabase as any).from("bookmarks").select("post_id").eq("user_id", user.id).in("post_id", postIds),
      ]);
      userLikes = new Set((likesRes.data || []).map((l: any) => l.post_id));
      userBookmarks = new Set((bookmarksRes.data || []).map((b: any) => b.post_id));
    }

    const postsById = new Map<string, any>();
    for (const p of (posts || []) as any[]) postsById.set(p.id, p);

    const orderedPosts = sliced
      .map((l) => {
        const p = postsById.get(l.post_id);
        if (!p) return null;
        return {
          id: p.id,
          authorId: p.author_id,
          author: {
            username: p.author?.username || "unknown",
            displayName: p.author?.display_name,
            avatarUrl: p.author?.avatar_url,
            role: p.author?.role || 0,
          },
          postType: p.post_type,
          content: p.content,
          isSensitive: p.is_sensitive,
          isPinned: l.pinned,
          createdAt: p.published_at || p.created_at,
          likeCount: p.like_count || 0,
          commentCount: p.comment_count || 0,
          reblogCount: p.reblog_count || 0,
          hasLiked: userLikes.has(p.id),
          hasBookmarked: userBookmarks.has(p.id),
          tags: [],
          addedToCommunityAt: l.added_at,
        };
      })
      .filter(Boolean);

    return { success: true, posts: orderedPosts, community, hasMore };
  } catch (e: any) {
    return { success: false, error: e.message || "Failed to fetch community feed" };
  }
}
