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

export async function joinCommunity(
  communityId: string,
  message?: string
): Promise<{ success: boolean; pending?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: community } = await (supabase as any)
      .from("communities")
      .select("join_policy")
      .eq("id", communityId)
      .single();
    if (!community) return { success: false, error: "Community not found" };

    if (community.join_policy === "open") {
      const { error } = await (supabase as any)
        .from("community_members")
        .insert({ community_id: communityId, user_id: user.id, role: "member" });
      if (error && error.code !== "23505") return { success: false, error: error.message };
      return { success: true, pending: false };
    }

    // request or invite_only -> create a join request
    const { error } = await (supabase as any)
      .from("community_join_requests")
      .insert({
        community_id: communityId,
        user_id: user.id,
        message: message?.trim() || null,
      });
    if (error && error.code !== "23505") return { success: false, error: error.message };
    return { success: true, pending: true };
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

// ---------- Phase 2 ----------

export interface CommunityRule {
  id: string;
  position: number;
  title: string;
  body: string | null;
}

export interface JoinRequest {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  message: string | null;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface CommunityMember {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: "member" | "moderator" | "owner";
  joinedAt: string;
}

export async function updateCommunity(
  communityId: string,
  updates: {
    name?: string;
    description?: string | null;
    bannerUrl?: string | null;
    iconUrl?: string | null;
    nsfw?: boolean;
    visibility?: "public" | "restricted" | "private";
    joinPolicy?: "open" | "request" | "invite_only";
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const patch: any = {};
    if (updates.name !== undefined) patch.name = updates.name.trim();
    if (updates.description !== undefined) patch.description = updates.description?.trim() || null;
    if (updates.bannerUrl !== undefined) patch.banner_url = updates.bannerUrl;
    if (updates.iconUrl !== undefined) patch.icon_url = updates.iconUrl;
    if (updates.nsfw !== undefined) patch.nsfw = updates.nsfw;
    if (updates.visibility !== undefined) patch.visibility = updates.visibility;
    if (updates.joinPolicy !== undefined) patch.join_policy = updates.joinPolicy;

    const { error } = await (supabase as any)
      .from("communities")
      .update(patch)
      .eq("id", communityId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/communities`);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCommunity(communityId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("communities")
      .delete()
      .eq("id", communityId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/communities");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function requestJoinCommunity(
  communityId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("community_join_requests")
      .insert({
        community_id: communityId,
        user_id: user.id,
        message: message?.trim() || null,
      });

    if (error && error.code !== "23505") return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function listJoinRequests(
  communityId: string,
  status: "pending" | "approved" | "rejected" = "pending"
): Promise<{ success: boolean; requests?: JoinRequest[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("community_join_requests")
      .select(`
        id, message, status, created_at, user_id,
        user:profiles!community_join_requests_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq("community_id", communityId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };

    const requests = ((data as any[]) || []).map((r) => ({
      id: r.id,
      userId: r.user_id,
      username: r.user?.username || "unknown",
      displayName: r.user?.display_name || null,
      avatarUrl: r.user?.avatar_url || null,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));

    return { success: true, requests };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function reviewJoinRequest(
  requestId: string,
  decision: "approved" | "rejected"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { error } = await (supabase as any)
      .from("community_join_requests")
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function listCommunityMembers(
  communityId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ success: boolean; members?: CommunityMember[]; hasMore?: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const limit = opts?.limit ?? 50;
    const offset = opts?.offset ?? 0;

    const { data, error } = await (supabase as any)
      .from("community_members")
      .select(`
        role, joined_at, user_id,
        user:profiles!community_members_user_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq("community_id", communityId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true })
      .range(offset, offset + limit);

    if (error) return { success: false, error: error.message };

    const rows = (data as any[]) || [];
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const members = sliced.map((m) => ({
      userId: m.user_id,
      username: m.user?.username || "unknown",
      displayName: m.user?.display_name || null,
      avatarUrl: m.user?.avatar_url || null,
      role: m.role,
      joinedAt: m.joined_at,
    }));

    return { success: true, members, hasMore };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function changeMemberRole(
  communityId: string,
  userId: string,
  role: "member" | "moderator" | "owner"
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("community_members")
      .update({ role })
      .eq("community_id", communityId)
      .eq("user_id", userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeMember(
  communityId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("community_members")
      .delete()
      .eq("community_id", communityId)
      .eq("user_id", userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function setCommunityPostPinned(
  communityId: string,
  postId: string,
  pinned: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("community_posts")
      .update({ pinned })
      .eq("community_id", communityId)
      .eq("post_id", postId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function listCommunityRules(
  communityId: string
): Promise<{ success: boolean; rules?: CommunityRule[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from("community_rules")
      .select("id, position, title, body")
      .eq("community_id", communityId)
      .order("position", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, rules: ((data as any[]) || []) as CommunityRule[] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function upsertCommunityRule(
  communityId: string,
  rule: { id?: string; position: number; title: string; body?: string | null }
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const supabase = await createClient();
    if (rule.id) {
      const { error } = await (supabase as any)
        .from("community_rules")
        .update({
          position: rule.position,
          title: rule.title.trim(),
          body: rule.body?.trim() || null,
        })
        .eq("id", rule.id);
      if (error) return { success: false, error: error.message };
      return { success: true, id: rule.id };
    } else {
      const { data, error } = await (supabase as any)
        .from("community_rules")
        .insert({
          community_id: communityId,
          position: rule.position,
          title: rule.title.trim(),
          body: rule.body?.trim() || null,
        })
        .select("id")
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, id: (data as any).id };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteCommunityRule(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from("community_rules")
      .delete()
      .eq("id", ruleId);
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
