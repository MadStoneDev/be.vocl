"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Follow a tag
 */
export async function followTag(tagId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check if already following
    const { data: existing } = await supabase
      .from("followed_tags")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("tag_id", tagId)
      .single();

    if (existing) {
      return { success: true }; // Already following
    }

    const { error } = await supabase.from("followed_tags").insert({
      profile_id: user.id,
      tag_id: tagId,
    });

    if (error) {
      console.error("Follow tag error:", error);
      return { success: false, error: "Failed to follow tag" };
    }

    revalidatePath("/search");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Follow tag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Follow a tag by name (creates tag if it doesn't exist)
 */
export async function followTagByName(tagName: string): Promise<{
  success: boolean;
  tagId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const normalizedName = tagName.trim().replace(/^#/, "");

    // Find or create the tag (case-insensitive lookup, preserve casing on create)
    const { data: existingTags } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", normalizedName)
      .limit(1);
    let tag = existingTags?.[0] || null;

    if (!tag) {
      const { data: newTag, error: createError } = await supabase
        .from("tags")
        .insert({ name: normalizedName, post_count: 0 })
        .select("id")
        .single();

      if (createError) {
        console.error("Create tag error:", createError);
        return { success: false, error: "Failed to create tag" };
      }
      tag = newTag;
    }

    if (!tag) {
      return { success: false, error: "Failed to get tag" };
    }

    // Follow the tag
    const result = await followTag(tag.id);
    return { ...result, tagId: tag.id };
  } catch (error) {
    console.error("Follow tag by name error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unfollow a tag
 */
export async function unfollowTag(tagId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("followed_tags")
      .delete()
      .eq("profile_id", user.id)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Unfollow tag error:", error);
      return { success: false, error: "Failed to unfollow tag" };
    }

    revalidatePath("/search");
    revalidatePath("/feed");
    return { success: true };
  } catch (error) {
    console.error("Unfollow tag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if current user is following a tag
 */
export async function isFollowingTag(tagId: string): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return false;

    const { data } = await supabase
      .from("followed_tags")
      .select("profile_id")
      .eq("profile_id", user.id)
      .eq("tag_id", tagId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Get tags the current user is following
 */
export async function getFollowedTags(): Promise<{
  success: boolean;
  tags?: Array<{
    id: string;
    name: string;
    postCount: number;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: followedTags, error } = await supabase
      .from("followed_tags")
      .select(`
        tag_id,
        tag:tags!tag_id (
          id,
          name,
          post_count
        )
      `)
      .eq("profile_id", user.id);

    if (error) {
      console.error("Get followed tags error:", error);
      return { success: false, error: "Failed to get followed tags" };
    }

    const tags = (followedTags || [])
      .filter((ft): ft is typeof ft & { tag: { id: string; name: string; post_count: number } } =>
        ft.tag !== null && typeof ft.tag === 'object' && !Array.isArray(ft.tag)
      )
      .map((ft) => ({
        id: ft.tag.id,
        name: ft.tag.name,
        postCount: ft.tag.post_count,
      }));

    return { success: true, tags };
  } catch (error) {
    console.error("Get followed tags error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tags for a specific post
 */
export async function getPostTags(postId: string): Promise<{
  success: boolean;
  tags?: Array<{
    id: string;
    name: string;
  }>;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: postTags, error } = await supabase
      .from("post_tags")
      .select(`
        tag_id,
        tag:tags!tag_id (
          id,
          name
        )
      `)
      .eq("post_id", postId);

    if (error) {
      console.error("Get post tags error:", error);
      return { success: false, error: "Failed to get post tags" };
    }

    const tags = (postTags || [])
      .filter((pt): pt is typeof pt & { tag: { id: string; name: string } } =>
        pt.tag !== null && typeof pt.tag === 'object' && !Array.isArray(pt.tag)
      )
      .map((pt) => ({
        id: pt.tag.id,
        name: pt.tag.name,
      }));

    return { success: true, tags };
  } catch (error) {
    console.error("Get post tags error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tag info by name
 */
export async function getTagByName(tagName: string): Promise<{
  success: boolean;
  tag?: {
    id: string;
    name: string;
    postCount: number;
    isFollowing: boolean;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const normalizedName = tagName.trim().replace(/^#/, "");

    const { data: matchedTags, error } = await supabase
      .from("tags")
      .select("id, name, post_count")
      .ilike("name", normalizedName)
      .limit(1);
    const tag = matchedTags?.[0] || null;

    if (error || !tag) {
      return { success: false, error: "Tag not found" };
    }

    // Check if user is following
    let isFollowing = false;
    if (user) {
      const { data: following } = await supabase
        .from("followed_tags")
        .select("profile_id")
        .eq("profile_id", user.id)
        .eq("tag_id", tag.id)
        .single();
      isFollowing = !!following;
    }

    return {
      success: true,
      tag: {
        id: tag.id,
        name: tag.name,
        postCount: tag.post_count,
        isFollowing,
      },
    };
  } catch (error) {
    console.error("Get tag by name error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get posts by tag name
 */
export async function getPostsByTag(
  tagName: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  success: boolean;
  posts?: Array<{
    id: string;
    authorId: string;
    author: {
      username: string;
      displayName: string | null;
      avatarUrl: string | null;
      role: number;
    };
    postType: string;
    content: any;
    isSensitive: boolean;
    createdAt: string;
    likeCount: number;
    commentCount: number;
    reblogCount: number;
    hasLiked: boolean;
    hasCommented: boolean;
    hasReblogged: boolean;
    tags: Array<{ id: string; name: string }>;
  }>;
  hasMore?: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const limit = options?.limit || 20;
    const offset = options?.offset || 0;
    const normalizedName = tagName.trim().replace(/^#/, "");

    // Get user's sensitive content preferences
    let showSensitive = false;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("show_sensitive_posts")
        .eq("id", user.id)
        .single();
      showSensitive = profile?.show_sensitive_posts ?? false;
    }

    // Get tag ID (case-insensitive)
    const { data: matchedTags2 } = await supabase
      .from("tags")
      .select("id")
      .ilike("name", normalizedName)
      .limit(1);
    const tag = matchedTags2?.[0] || null;

    if (!tag) {
      return { success: true, posts: [], hasMore: false };
    }

    // Get post IDs with this tag
    let query = supabase
      .from("post_tags")
      .select(`
        post_id,
        post:posts!post_id (
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          created_at,
          status,
          author:author_id (
            username,
            display_name,
            avatar_url,
            role
          )
        )
      `)
      .eq("tag_id", tag.id)
      .order("created_at", { ascending: false, foreignTable: "posts" })
      .range(offset, offset + limit);

    const { data: postTags, error } = await query;

    if (error) {
      console.error("Get posts by tag error:", error);
      return { success: false, error: "Failed to fetch posts" };
    }

    // Filter to published posts and respect sensitive settings
    const validPosts = (postTags || [])
      .filter((pt: any) => {
        const post = pt.post;
        if (!post || post.status !== "published") return false;
        if (post.is_sensitive && !showSensitive) return false;
        return true;
      })
      .map((pt: any) => pt.post);

    if (validPosts.length === 0) {
      return { success: true, posts: [], hasMore: false };
    }

    const postIds = validPosts.map((p: any) => p.id);

    // Get counts and interactions in parallel
    const [likeCounts, commentCounts, reblogCounts, userLikes, userComments, userReblogs, allTags] = await Promise.all([
      supabase.from("likes").select("post_id").in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
      supabase.from("posts").select("reblogged_from_id").in("reblogged_from_id", postIds).eq("status", "published"),
      user ? supabase.from("likes").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      user ? supabase.from("comments").select("post_id").eq("user_id", user.id).in("post_id", postIds) : Promise.resolve({ data: [] }),
      user ? supabase.from("posts").select("reblogged_from_id").eq("author_id", user.id).in("reblogged_from_id", postIds).neq("status", "deleted") : Promise.resolve({ data: [] }),
      supabase.from("post_tags").select("post_id, tag:tags!tag_id(id, name)").in("post_id", postIds),
    ]);

    // Build count maps
    const likeCountMap = new Map<string, number>();
    const commentCountMap = new Map<string, number>();
    const reblogCountMap = new Map<string, number>();
    const userLikedSet = new Set((userLikes.data || []).map((l: any) => l.post_id));
    const userCommentedSet = new Set((userComments.data || []).map((c: any) => c.post_id));
    const userRebloggedSet = new Set((userReblogs.data || []).map((r: any) => r.reblogged_from_id));

    for (const like of likeCounts.data || []) {
      likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) || 0) + 1);
    }
    for (const comment of commentCounts.data || []) {
      commentCountMap.set(comment.post_id, (commentCountMap.get(comment.post_id) || 0) + 1);
    }
    for (const reblog of reblogCounts.data || []) {
      reblogCountMap.set(reblog.reblogged_from_id, (reblogCountMap.get(reblog.reblogged_from_id) || 0) + 1);
    }

    // Build tags map
    const tagsMap = new Map<string, Array<{ id: string; name: string }>>();
    for (const pt of allTags.data || []) {
      const tag = pt.tag as any;
      if (tag && typeof tag === "object") {
        if (!tagsMap.has(pt.post_id)) {
          tagsMap.set(pt.post_id, []);
        }
        tagsMap.get(pt.post_id)!.push({ id: tag.id, name: tag.name });
      }
    }

    const posts = validPosts.map((post: any) => ({
      id: post.id,
      authorId: post.author_id,
      author: {
        username: post.author.username,
        displayName: post.author.display_name,
        avatarUrl: post.author.avatar_url,
        role: post.author.role || 0,
      },
      postType: post.post_type,
      content: post.content,
      isSensitive: post.is_sensitive,
      createdAt: post.created_at,
      likeCount: likeCountMap.get(post.id) || 0,
      commentCount: commentCountMap.get(post.id) || 0,
      reblogCount: reblogCountMap.get(post.id) || 0,
      hasLiked: userLikedSet.has(post.id),
      hasCommented: userCommentedSet.has(post.id),
      hasReblogged: userRebloggedSet.has(post.id),
      tags: tagsMap.get(post.id) || [],
    }));

    return {
      success: true,
      posts,
      hasMore: posts.length === limit,
    };
  } catch (error) {
    console.error("Get posts by tag error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get tags for multiple posts (batch)
 */
export async function getPostTagsBatch(postIds: string[]): Promise<{
  success: boolean;
  tagsByPostId?: Record<string, Array<{ id: string; name: string }>>;
  error?: string;
}> {
  try {
    if (postIds.length === 0) {
      return { success: true, tagsByPostId: {} };
    }

    const supabase = await createClient();

    const { data: postTags, error } = await supabase
      .from("post_tags")
      .select(`
        post_id,
        tag_id,
        tag:tags!tag_id (
          id,
          name
        )
      `)
      .in("post_id", postIds);

    if (error) {
      console.error("Get post tags batch error:", error);
      return { success: false, error: "Failed to get post tags" };
    }

    const tagsByPostId: Record<string, Array<{ id: string; name: string }>> = {};

    for (const postId of postIds) {
      tagsByPostId[postId] = [];
    }

    for (const pt of postTags || []) {
      const tag = pt.tag;
      if (tag && typeof tag === 'object' && !Array.isArray(tag) && tagsByPostId[pt.post_id]) {
        tagsByPostId[pt.post_id].push({
          id: (tag as { id: string; name: string }).id,
          name: (tag as { id: string; name: string }).name,
        });
      }
    }

    return { success: true, tagsByPostId };
  } catch (error) {
    console.error("Get post tags batch error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}
