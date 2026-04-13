"use server";

import { createClient } from "@/lib/supabase/server";

// Sensitive keywords that may contain NSFW content
const SENSITIVE_KEYWORDS = [
  "nsfw",
  "nude",
  "naked",
  "sex",
  "porn",
  "xxx",
  "adult",
  "explicit",
  "erotic",
  "fetish",
  "kink",
  "onlyfans",
  "18+",
  "r18",
];

export interface SearchResult {
  users: Array<{
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    followerCount: number;
    isFollowing: boolean;
    followsYou?: boolean;
  }>;
  posts: Array<{
    id: string;
    authorId: string;
    author: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
    };
    postType: string;
    content: any;
    isSensitive: boolean;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    tags: Array<{ id: string; name: string }>;
  }>;
  tags: Array<{
    id: string;
    name: string;
    postCount: number;
  }>;
}

export async function checkSensitiveSearch(
  query: string
): Promise<{ isSensitive: boolean; userAllowsSensitive: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const normalizedQuery = query.toLowerCase();
  const isSensitive = SENSITIVE_KEYWORDS.some((keyword) =>
    normalizedQuery.includes(keyword)
  );

  let userAllowsSensitive = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("show_sensitive_posts")
      .eq("id", user.id)
      .single() as { data: { show_sensitive_posts: boolean } | null };

    userAllowsSensitive = profile?.show_sensitive_posts ?? false;
  }

  return { isSensitive, userAllowsSensitive };
}

export async function searchUsers(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  users?: SearchResult["users"];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    // Remove @ prefix if present
    const searchTerm = query.startsWith("@") ? query.slice(1) : query;

    if (!searchTerm.trim()) {
      return { success: true, users: [], total: 0 };
    }

    // Search by username or display name
    const { data: profiles, error, count } = await supabase
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        avatar_url,
        bio
      `,
        { count: "exact" }
      )
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%`)
      .order("username")
      .range(offset, offset + limit - 1);

    if (error) throw error;

    type ProfileResult = {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
    };

    // Batch fetch follower counts and following status (avoids N+1)
    const profileIds = ((profiles || []) as ProfileResult[]).map((p) => p.id);

    const [followerData, followingSet] = await Promise.all([
      supabase.from("follows").select("following_id").in("following_id", profileIds),
      user
        ? supabase.from("follows").select("following_id").eq("follower_id", user.id).in("following_id", profileIds)
        : Promise.resolve({ data: [] }),
    ]);

    // Build follower count map
    const followerCountMap = new Map<string, number>();
    for (const f of (followerData.data || []) as any[]) {
      followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1);
    }

    // Build following set
    const followingIds = new Set(((followingSet as any).data || []).map((f: any) => f.following_id));

    const users = ((profiles || []) as ProfileResult[]).map((profile) => ({
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      followerCount: followerCountMap.get(profile.id) || 0,
      isFollowing: followingIds.has(profile.id),
    }));

    return { success: true, users, total: count || 0 };
  } catch (error) {
    console.error("Search users error:", error);
    return { success: false, error: "Failed to search users" };
  }
}

export async function searchTags(
  query: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  tags?: SearchResult["tags"];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    // Remove # prefix if present
    const searchTerm = query.startsWith("#") ? query.slice(1) : query;

    if (!searchTerm.trim()) {
      return { success: true, tags: [], total: 0 };
    }

    const { data: tags, error, count } = await supabase
      .from("tags")
      .select("id, name, post_count", { count: "exact" })
      .ilike("name", `%${searchTerm}%`)
      .order("post_count", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    type TagResult = { id: string; name: string; post_count: number };

    return {
      success: true,
      tags: ((tags || []) as TagResult[]).map((tag) => ({
        id: tag.id,
        name: tag.name,
        postCount: tag.post_count,
      })),
      total: count || 0,
    };
  } catch (error) {
    console.error("Search tags error:", error);
    return { success: false, error: "Failed to search tags" };
  }
}

export async function searchPosts(
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    tagId?: string;
    includeSensitive?: boolean;
    // Advanced filters
    postType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: "recent" | "popular";
    hasMedia?: boolean;
    authorUsername?: string;
  }
): Promise<{
  success: boolean;
  posts?: SearchResult["posts"];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const includeSensitive = options?.includeSensitive ?? false;

    // Check user's sensitive content preference
    let userAllowsSensitive = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("show_sensitive_posts")
        .eq("id", user.id)
        .single() as { data: { show_sensitive_posts: boolean } | null };
      userAllowsSensitive = profile?.show_sensitive_posts ?? false;
    }

    const shouldFilterSensitive = !userAllowsSensitive && !includeSensitive;

    // If searching by tag
    if (options?.tagId) {
      const { data: postTags, error: tagError } = await supabase
        .from("post_tags")
        .select("post_id")
        .eq("tag_id", options.tagId);

      if (tagError) throw tagError;

      type PostTagResult = { post_id: string };
      const postIds = ((postTags || []) as PostTagResult[]).map((pt) => pt.post_id);

      if (postIds.length === 0) {
        return { success: true, posts: [], total: 0 };
      }

      let postsQuery = supabase
        .from("posts")
        .select(
          `
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          created_at,
          like_count,
          comment_count,
          reblog_count,
          profiles!posts_author_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `,
          { count: "exact" }
        )
        .in("id", postIds)
        .eq("status", "published");

      // Apply advanced filters
      postsQuery = applyAdvancedFilters(postsQuery, options);

      // Author filter (filter by joined profile username)
      if (options?.authorUsername) {
        postsQuery = postsQuery.ilike(
          "profiles.username",
          `%${options.authorUsername}%`
        );
      }

      if (shouldFilterSensitive) {
        postsQuery = postsQuery.eq("is_sensitive", false);
      }

      // Sorting
      if (options?.sortBy === "popular") {
        // Sort by engagement (like_count + comment_count + reblog_count) desc
        // Supabase doesn't support computed column ordering directly,
        // so we fetch all and sort in JS, then paginate
      }

      postsQuery = postsQuery
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: posts, error, count } = await postsQuery;

      if (error) throw error;

      let resultPosts = posts || [];

      // Filter out posts where author didn't match (Supabase nested filter returns null profiles)
      if (options?.authorUsername) {
        resultPosts = resultPosts.filter((p: any) => p.profiles !== null);
      }

      // Get like and comment counts
      const formattedPosts = await formatPosts(supabase, resultPosts);

      // Sort by popularity if requested
      if (options?.sortBy === "popular") {
        formattedPosts.sort(
          (a, b) =>
            b.likeCount + b.commentCount - (a.likeCount + a.commentCount)
        );
      }

      return { success: true, posts: formattedPosts, total: count || 0 };
    }

    // Full-text search on posts
    const searchTerm = query.trim();
    if (!searchTerm) {
      return { success: true, posts: [], total: 0 };
    }

    // Search in post content (JSONB)
    let postsQuery = supabase
      .from("posts")
      .select(
        `
        id,
        author_id,
        post_type,
        content,
        is_sensitive,
        created_at,
        like_count,
        comment_count,
        reblog_count,
        profiles!posts_author_id_fkey (
          username,
          display_name,
          avatar_url
        )
      `,
        { count: "exact" }
      )
      .eq("status", "published")
      .or(
        `content->plain.ilike.%${searchTerm}%,content->html.ilike.%${searchTerm}%,content->caption_html.ilike.%${searchTerm}%`
      );

    // Apply advanced filters
    postsQuery = applyAdvancedFilters(postsQuery, options);

    // Author filter
    if (options?.authorUsername) {
      postsQuery = postsQuery.ilike(
        "profiles.username",
        `%${options.authorUsername}%`
      );
    }

    if (shouldFilterSensitive) {
      postsQuery = postsQuery.eq("is_sensitive", false);
    }

    postsQuery = postsQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: posts, error, count } = await postsQuery;

    if (error) throw error;

    let resultPosts = posts || [];

    // Filter out posts where author didn't match
    if (options?.authorUsername) {
      resultPosts = resultPosts.filter((p: any) => p.profiles !== null);
    }

    const formattedPosts = await formatPosts(supabase, resultPosts);

    // Sort by popularity if requested
    if (options?.sortBy === "popular") {
      formattedPosts.sort(
        (a, b) =>
          b.likeCount + b.commentCount - (a.likeCount + a.commentCount)
      );
    }

    return { success: true, posts: formattedPosts, total: count || 0 };
  } catch (error) {
    console.error("Search posts error:", error);
    return { success: false, error: "Failed to search posts" };
  }
}

function applyAdvancedFilters(
  query: any,
  options?: {
    postType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: "recent" | "popular";
    hasMedia?: boolean;
    authorUsername?: string;
  }
) {
  if (options?.postType) {
    query = query.eq("post_type", options.postType);
  }
  if (options?.hasMedia) {
    query = query.in("post_type", ["image", "video", "audio", "gallery"]);
  }
  if (options?.dateFrom) {
    query = query.gte("created_at", options.dateFrom);
  }
  if (options?.dateTo) {
    // Add end-of-day to include the full day
    const endDate = options.dateTo.includes("T")
      ? options.dateTo
      : `${options.dateTo}T23:59:59.999Z`;
    query = query.lte("created_at", endDate);
  }
  return query;
}

async function formatPosts(supabase: any, posts: any[]): Promise<SearchResult["posts"]> {
  // Batch fetch tags for all posts
  const postIds = posts.map((p) => p.id);
  const { data: postTagsData } = await supabase
    .from("post_tags")
    .select("post_id, tag:tag_id (id, name)")
    .in("post_id", postIds);

  // Build tags map
  const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
  ((postTagsData || []) as any[]).forEach((pt) => {
    if (pt.tag) {
      const existing = tagsMap.get(pt.post_id) || [];
      existing.push({ id: pt.tag.id, name: pt.tag.name });
      tagsMap.set(pt.post_id, existing);
    }
  });

  // Batch fetch like and comment counts (avoids N+1)
  const [likeData, commentData] = await Promise.all([
    supabase.from("likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
  ]);

  const likeCountMap = new Map<string, number>();
  for (const l of (likeData.data || []) as any[]) {
    likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) || 0) + 1);
  }

  const commentCountMap = new Map<string, number>();
  for (const c of (commentData.data || []) as any[]) {
    commentCountMap.set(c.post_id, (commentCountMap.get(c.post_id) || 0) + 1);
  }

  return posts.map((post) => {
    const profile = post.profiles;
    return {
      id: post.id,
      authorId: post.author_id,
      author: {
        username: profile?.username || "unknown",
        displayName: profile?.display_name,
        avatarUrl: profile?.avatar_url,
      },
      postType: post.post_type,
      content: post.content,
      isSensitive: post.is_sensitive,
      createdAt: post.created_at,
      likeCount: likeCountMap.get(post.id) || 0,
      commentCount: commentCountMap.get(post.id) || 0,
      tags: tagsMap.get(post.id) || [],
    };
  });
}

export async function getPostsByTag(
  tagName: string,
  options?: { limit?: number; offset?: number; includeSensitive?: boolean }
): Promise<{
  success: boolean;
  posts?: SearchResult["posts"];
  tag?: { id: string; name: string; postCount: number };
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Find the tag
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id, name, post_count")
      .eq("name", tagName.toLowerCase())
      .single() as { data: { id: string; name: string; post_count: number } | null; error: any };

    if (tagError || !tag) {
      return { success: false, error: "Tag not found" };
    }

    // Get posts with this tag
    const result = await searchPosts("", {
      ...options,
      tagId: tag.id,
    });

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      posts: result.posts,
      tag: {
        id: tag.id,
        name: tag.name,
        postCount: tag.post_count,
      },
      total: result.total,
    };
  } catch (error) {
    console.error("Get posts by tag error:", error);
    return { success: false, error: "Failed to get posts by tag" };
  }
}

export async function getTrendingTags(
  limit: number = 10
): Promise<{
  success: boolean;
  tags?: Array<{ id: string; name: string; postCount: number }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: tags, error } = await supabase
      .from("tags")
      .select("id, name, post_count")
      .gt("post_count", 0)
      .order("post_count", { ascending: false })
      .limit(limit);

    if (error) throw error;

    type TagResult = { id: string; name: string; post_count: number };

    return {
      success: true,
      tags: ((tags || []) as TagResult[]).map((tag) => ({
        id: tag.id,
        name: tag.name,
        postCount: tag.post_count,
      })),
    };
  } catch (error) {
    console.error("Get trending tags error:", error);
    return { success: false, error: "Failed to get trending tags" };
  }
}

export async function getSuggestedUsers(
  limit: number = 5
): Promise<{
  success: boolean;
  users?: SearchResult["users"];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    type ProfileResult = {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
    };

    // If logged in, try smart suggestions first
    if (user) {
      // 1. Get who the current user follows
      const { data: myFollowing } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const myFollowingIds = new Set((myFollowing || []).map((f: any) => f.following_id));

      // 2. Get "friends of friends" — people followed by those I follow
      let friendsOfFriends: string[] = [];
      if (myFollowingIds.size > 0) {
        const { data: fofData } = await supabase
          .from("follows")
          .select("following_id")
          .in("follower_id", Array.from(myFollowingIds))
          .not("following_id", "eq", user.id);

        if (fofData) {
          // Count how many mutual connections each suggested user has
          const fofCountMap = new Map<string, number>();
          for (const f of fofData as any[]) {
            if (!myFollowingIds.has(f.following_id)) {
              fofCountMap.set(f.following_id, (fofCountMap.get(f.following_id) || 0) + 1);
            }
          }
          // Sort by mutual connection count (most connections first)
          friendsOfFriends = Array.from(fofCountMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id)
            .slice(0, limit * 3); // Get extra for filtering
        }
      }

      // 3. If we have friend-of-friend suggestions, fetch their profiles
      if (friendsOfFriends.length > 0) {
        const { data: fofProfiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio")
          .in("id", friendsOfFriends);

        if (fofProfiles && fofProfiles.length > 0) {
          const fofProfileIds = (fofProfiles as ProfileResult[]).map((p) => p.id);
          const { data: fofFollowerData } = await supabase
            .from("follows")
            .select("following_id")
            .in("following_id", fofProfileIds);

          const fofFollowerCountMap = new Map<string, number>();
          for (const f of (fofFollowerData || []) as any[]) {
            fofFollowerCountMap.set(f.following_id, (fofFollowerCountMap.get(f.following_id) || 0) + 1);
          }

          const smartSuggestions = (fofProfiles as ProfileResult[])
            .map((p) => ({
              id: p.id,
              username: p.username,
              displayName: p.display_name,
              avatarUrl: p.avatar_url,
              bio: p.bio,
              followerCount: fofFollowerCountMap.get(p.id) || 0,
              isFollowing: false,
            }))
            // Maintain the friends-of-friends ordering (most mutual connections first)
            .sort((a, b) => {
              const aIdx = friendsOfFriends.indexOf(a.id);
              const bIdx = friendsOfFriends.indexOf(b.id);
              return aIdx - bIdx;
            });

          if (smartSuggestions.length >= limit) {
            return { success: true, users: await annotateFollowsYou(supabase, user.id, smartSuggestions.slice(0, limit)) };
          }

          // If we don't have enough smart suggestions, we'll fill with popular users below
          // but first return what we have + fallback
          const smartIds = new Set(smartSuggestions.map((u) => u.id));
          const needed = limit - smartSuggestions.length;

          const fallback = await getFallbackSuggestions(supabase, user.id, myFollowingIds, smartIds, needed);
          return { success: true, users: await annotateFollowsYou(supabase, user.id, [...smartSuggestions, ...fallback]) };
        }
      }

      // 4. Fallback: popular users not already followed
      const fallback = await getFallbackSuggestions(supabase, user.id, myFollowingIds, new Set(), limit);
      return { success: true, users: await annotateFollowsYou(supabase, user.id, fallback) };
    }

    // Not logged in: just show popular users
    const fallback = await getFallbackSuggestions(supabase, null, new Set(), new Set(), limit);
    return { success: true, users: fallback };
  } catch (error) {
    console.error("Get suggested users error:", error);
    return { success: false, error: "Failed to get suggested users" };
  }
}

async function annotateFollowsYou(
  supabase: any,
  currentUserId: string,
  users: NonNullable<SearchResult["users"]>
): Promise<SearchResult["users"]> {
  if (users.length === 0) return users;
  const ids = users.map((u) => u.id);
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", currentUserId)
    .in("follower_id", ids);
  const followsYouSet = new Set(((data || []) as any[]).map((f) => f.follower_id));
  return users.map((u) => ({ ...u, followsYou: followsYouSet.has(u.id) }));
}

async function getFallbackSuggestions(
  supabase: any,
  userId: string | null,
  alreadyFollowing: Set<string>,
  excludeIds: Set<string>,
  limit: number
): Promise<SearchResult["users"]> {
  type ProfileResult = {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };

  let query = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .limit(limit + alreadyFollowing.size + excludeIds.size + 10);

  if (userId) {
    query = query.neq("id", userId);
  }

  const { data: profiles, error } = await query;
  if (error) throw error;

  const profileIds = ((profiles || []) as ProfileResult[]).map((p) => p.id);

  const { data: followerData } = await supabase
    .from("follows")
    .select("following_id")
    .in("following_id", profileIds);

  const followerCountMap = new Map<string, number>();
  for (const f of (followerData || []) as any[]) {
    followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) || 0) + 1);
  }

  return ((profiles || []) as ProfileResult[])
    .filter((p) => !alreadyFollowing.has(p.id) && !excludeIds.has(p.id))
    .map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
      followerCount: followerCountMap.get(p.id) || 0,
      isFollowing: false,
    }))
    .sort((a, b) => b.followerCount - a.followerCount)
    .slice(0, limit);
}
