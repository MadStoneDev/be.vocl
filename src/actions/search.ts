"use server";

import { createServerClient } from "@/lib/supabase/server";

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
  const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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

    // Get follower counts and following status
    const users = await Promise.all(
      ((profiles || []) as ProfileResult[]).map(async (profile) => {
        // Get follower count
        const { count: followerCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id);

        // Check if current user is following
        let isFollowing = false;
        if (user && user.id !== profile.id) {
          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", profile.id)
            .single();
          isFollowing = !!followData;
        }

        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          followerCount: followerCount || 0,
          isFollowing,
        };
      })
    );

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
    const supabase = await createServerClient();
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
  }
): Promise<{
  success: boolean;
  posts?: SearchResult["posts"];
  total?: number;
  error?: string;
}> {
  try {
    const supabase = await createServerClient();
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
          profiles!posts_author_id_fkey (
            username,
            display_name,
            avatar_url
          )
        `,
          { count: "exact" }
        )
        .in("id", postIds)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (shouldFilterSensitive) {
        postsQuery = postsQuery.eq("is_sensitive", false);
      }

      const { data: posts, error, count } = await postsQuery;

      if (error) throw error;

      // Get like and comment counts
      const formattedPosts = await formatPosts(supabase, posts || []);

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
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (shouldFilterSensitive) {
      postsQuery = postsQuery.eq("is_sensitive", false);
    }

    const { data: posts, error, count } = await postsQuery;

    if (error) throw error;

    const formattedPosts = await formatPosts(supabase, posts || []);

    return { success: true, posts: formattedPosts, total: count || 0 };
  } catch (error) {
    console.error("Search posts error:", error);
    return { success: false, error: "Failed to search posts" };
  }
}

async function formatPosts(supabase: any, posts: any[]): Promise<SearchResult["posts"]> {
  return Promise.all(
    posts.map(async (post) => {
      // Get like count
      const { count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

      // Get comment count
      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

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
        likeCount: likeCount || 0,
        commentCount: commentCount || 0,
      };
    })
  );
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
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();

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
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Get users with most followers that current user isn't following
    let query = supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, bio")
      .limit(limit + 10); // Get extra to filter

    if (user) {
      // Exclude current user
      query = query.neq("id", user.id);
    }

    const { data: profiles, error } = await query;

    if (error) throw error;

    type ProfileResult = {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      bio: string | null;
    };

    // Get follower counts and filter out already followed users
    const usersWithCounts = await Promise.all(
      ((profiles || []) as ProfileResult[]).map(async (profile) => {
        const { count: followerCount } = await supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id);

        let isFollowing = false;
        if (user) {
          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", user.id)
            .eq("following_id", profile.id)
            .single();
          isFollowing = !!followData;
        }

        return {
          id: profile.id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          bio: profile.bio,
          followerCount: followerCount || 0,
          isFollowing,
        };
      })
    );

    // Sort by follower count and filter out already followed
    const suggested = usersWithCounts
      .filter((u) => !u.isFollowing)
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, limit);

    return { success: true, users: suggested };
  } catch (error) {
    console.error("Get suggested users error:", error);
    return { success: false, error: "Failed to get suggested users" };
  }
}
