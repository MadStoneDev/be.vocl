"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateUsernameFormat, isValidTimezone } from "@/lib/validation";
import { isValidProfileLinkUrl } from "@/lib/sanitize";
import { batchFetchPostStats } from "./shared/post-stats";

interface ProfileResult {
  success: boolean;
  error?: string;
}

interface Profile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  headerUrl?: string;
  bio?: string;
  timezone?: string;
  showLikes: boolean;
  showComments: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
  showSensitivePosts: boolean;
  blurSensitiveByDefault: boolean;
  allowAsks: boolean;
  allowAnonymousAsks: boolean;
  createdAt: string;
  role: number;
}

interface ProfileLink {
  id: string;
  title: string;
  url: string;
  sortOrder: number;
}

/**
 * Get a user's profile by username
 */
export async function getProfileByUsername(
  username: string
): Promise<{ success: boolean; profile?: Profile; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, username, display_name, avatar_url, header_url, bio, timezone, show_likes, show_comments, show_followers, show_following, show_sensitive_posts, blur_sensitive_by_default, allow_asks, allow_anonymous_asks, created_at, role")
      .eq("username", username)
      .single();

    if (error || !data) {
      return { success: false, error: "Profile not found" };
    }

    return {
      success: true,
      profile: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        headerUrl: data.header_url,
        bio: data.bio,
        timezone: data.timezone,
        showLikes: data.show_likes,
        showComments: data.show_comments,
        showFollowers: data.show_followers,
        showFollowing: data.show_following,
        showSensitivePosts: data.show_sensitive_posts,
        blurSensitiveByDefault: data.blur_sensitive_by_default,
        allowAsks: data.allow_asks ?? true,
        allowAnonymousAsks: data.allow_anonymous_asks ?? true,
        createdAt: data.created_at,
        role: data.role ?? 0,
      },
    };
  } catch (error) {
    console.error("Get profile error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get current user's profile
 */
export async function getCurrentProfile(): Promise<{
  success: boolean;
  profile?: Profile;
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

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id, username, display_name, avatar_url, header_url, bio, timezone, show_likes, show_comments, show_followers, show_following, show_sensitive_posts, blur_sensitive_by_default, allow_asks, allow_anonymous_asks, created_at, role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      return { success: false, error: "Profile not found" };
    }

    return {
      success: true,
      profile: {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        headerUrl: data.header_url,
        bio: data.bio,
        timezone: data.timezone,
        showLikes: data.show_likes,
        showComments: data.show_comments,
        showFollowers: data.show_followers,
        showFollowing: data.show_following,
        showSensitivePosts: data.show_sensitive_posts,
        blurSensitiveByDefault: data.blur_sensitive_by_default,
        allowAsks: data.allow_asks ?? true,
        allowAnonymousAsks: data.allow_anonymous_asks ?? true,
        createdAt: data.created_at,
        role: data.role ?? 0,
      },
    };
  } catch (error) {
    console.error("Get current profile error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update current user's profile
 */
export async function updateProfile(updates: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  headerUrl?: string;
  timezone?: string;
}): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate timezone if provided
    if (updates.timezone !== undefined && updates.timezone !== "" && !isValidTimezone(updates.timezone)) {
      return { success: false, error: "Invalid timezone" };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
    if (updates.headerUrl !== undefined) updateData.header_url = updates.headerUrl;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Update profile error:", error);
      return { success: false, error: "Failed to update profile" };
    }

    revalidatePath("/profile/[username]", "page");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update privacy settings
 */
export async function updatePrivacySettings(settings: {
  showLikes?: boolean;
  showComments?: boolean;
  showFollowers?: boolean;
  showFollowing?: boolean;
}): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (settings.showLikes !== undefined) updateData.show_likes = settings.showLikes;
    if (settings.showComments !== undefined) updateData.show_comments = settings.showComments;
    if (settings.showFollowers !== undefined) updateData.show_followers = settings.showFollowers;
    if (settings.showFollowing !== undefined) updateData.show_following = settings.showFollowing;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/profile/[username]", "page");
    revalidatePath("/settings/privacy");
    return { success: true };
  } catch (error) {
    console.error("Update privacy settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update content settings (NSFW)
 */
export async function updateContentSettings(settings: {
  showSensitivePosts?: boolean;
  blurSensitiveByDefault?: boolean;
}): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = { updated_at: new Date().toISOString() };
    if (settings.showSensitivePosts !== undefined)
      updateData.show_sensitive_posts = settings.showSensitivePosts;
    if (settings.blurSensitiveByDefault !== undefined)
      updateData.blur_sensitive_by_default = settings.blurSensitiveByDefault;

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/feed");
    revalidatePath("/settings/content");
    return { success: true };
  } catch (error) {
    console.error("Update content settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get profile links for a user
 */
export async function getProfileLinks(
  profileId: string
): Promise<{ success: boolean; links?: ProfileLink[]; error?: string }> {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await (supabase as any)
      .from("profile_links")
      .select("id, title, url, sort_order")
      .eq("profile_id", profileId)
      .order("sort_order", { ascending: true });

    if (error) {
      return { success: false, error: "Failed to fetch links" };
    }

    return {
      success: true,
      links: (data || []).map((link: any) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        sortOrder: link.sort_order,
      })),
    };
  } catch (error) {
    console.error("Get profile links error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Add a profile link
 */
export async function addProfileLink(
  title: string,
  url: string
): Promise<{ success: boolean; linkId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate URL to prevent XSS via javascript:, data:, or other malicious protocols
    if (!isValidProfileLinkUrl(url)) {
      return { success: false, error: "Invalid URL. Please enter a valid http or https URL." };
    }

    // Get current max sort order
    const { data: existing } = await (supabase as any)
      .from("profile_links")
      .select("sort_order")
      .eq("profile_id", user.id)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextSortOrder = existing?.[0]?.sort_order + 1 || 0;

    const { data, error } = await (supabase as any)
      .from("profile_links")
      .insert({
        profile_id: user.id,
        title,
        url,
        sort_order: nextSortOrder,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: "Failed to add link" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true, linkId: data.id };
  } catch (error) {
    console.error("Add profile link error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Remove a profile link
 */
export async function removeProfileLink(linkId: string): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("profile_links")
      .delete()
      .eq("id", linkId)
      .eq("profile_id", user.id);

    if (error) {
      return { success: false, error: "Failed to remove link" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Remove profile link error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Reorder profile links by swapping sort_order of two links
 */
export async function reorderProfileLinks(
  linkId: string,
  direction: "up" | "down"
): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get all links sorted
    const { data: allLinks, error: fetchError } = await (supabase as any)
      .from("profile_links")
      .select("id, sort_order")
      .eq("profile_id", user.id)
      .order("sort_order", { ascending: true });

    if (fetchError || !allLinks || allLinks.length < 2) {
      return { success: false, error: "Cannot reorder" };
    }

    const currentIndex = allLinks.findIndex((l: any) => l.id === linkId);
    if (currentIndex === -1) return { success: false, error: "Link not found" };

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= allLinks.length) {
      return { success: true }; // Already at edge
    }

    const current = allLinks[currentIndex];
    const swap = allLinks[swapIndex];

    // Swap sort_order values
    await Promise.all([
      (supabase as any)
        .from("profile_links")
        .update({ sort_order: swap.sort_order })
        .eq("id", current.id)
        .eq("profile_id", user.id),
      (supabase as any)
        .from("profile_links")
        .update({ sort_order: current.sort_order })
        .eq("id", swap.id)
        .eq("profile_id", user.id),
    ]);

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Reorder profile links error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get profile stats (posts, followers, following counts)
 * Optimized: Uses Promise.all to parallelize queries
 */
export async function getProfileStats(
  profileId: string
): Promise<{
  success: boolean;
  stats?: { posts: number; followers: number; following: number };
  error?: string;
}> {
  try {
    const supabase = await createClient();

    // Parallel fetch all counts at once
    const [postsResult, followersResult, followingResult] = await Promise.all([
      (supabase as any)
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", profileId)
        .eq("status", "published"),
      (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId),
      (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId),
    ]);

    return {
      success: true,
      stats: {
        posts: postsResult.count || 0,
        followers: followersResult.count || 0,
        following: followingResult.count || 0,
      },
    };
  } catch (error) {
    console.error("Get profile stats error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Pin a post to profile
 */
export async function pinPost(postId: string): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Unpin any currently pinned post
    await (supabase as any)
      .from("posts")
      .update({ is_pinned: false })
      .eq("author_id", user.id)
      .eq("is_pinned", true);

    // Pin the new post
    const { error } = await (supabase as any)
      .from("posts")
      .update({ is_pinned: true })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (error) {
      return { success: false, error: "Failed to pin post" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Pin post error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if onboarding is complete
 */
export async function checkOnboardingStatus(): Promise<{
  success: boolean;
  isComplete: boolean;
  profile?: {
    username: string;
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
  };
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, isComplete: false, error: "Unauthorized" };
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("username, display_name, avatar_url, bio")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      // If profile query fails, assume onboarding is complete to avoid blocking user
      console.error("Profile query error:", error);
      return { success: true, isComplete: true, error: "Profile not found" };
    }

    // Onboarding is complete if user has a username (required) and display name
    const isComplete = !!(data.username && data.display_name);

    return {
      success: true,
      isComplete,
      profile: {
        username: data.username,
        displayName: data.display_name,
        avatarUrl: data.avatar_url,
        bio: data.bio,
      },
    };
  } catch (error) {
    console.error("Check onboarding status error:", error);
    return { success: false, isComplete: false, error: "An unexpected error occurred" };
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(data: {
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  showSensitivePosts?: boolean;
  blurSensitiveByDefault?: boolean;
  timezone?: string;
}): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updateData: any = {
      display_name: data.displayName,
      bio: data.bio || null,
      avatar_url: data.avatarUrl || null,
      show_sensitive_posts: data.showSensitivePosts ?? false,
      blur_sensitive_by_default: data.blurSensitiveByDefault ?? true,
      timezone: data.timezone || "UTC",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await (supabase as any)
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Complete onboarding error:", error);
      return { success: false, error: "Failed to complete onboarding" };
    }

    revalidatePath("/feed");
    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Complete onboarding error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Unpin a post from profile
 */
export async function unpinPost(postId: string): Promise<ProfileResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await (supabase as any)
      .from("posts")
      .update({ is_pinned: false })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (error) {
      return { success: false, error: "Failed to unpin post" };
    }

    revalidatePath("/profile/[username]", "page");
    return { success: true };
  } catch (error) {
    console.error("Unpin post error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailability(
  username: string,
  excludeUserId?: string
): Promise<{ available: boolean; error?: string }> {
  // First validate format
  const formatResult = validateUsernameFormat(username);
  if (!formatResult.valid) {
    return { available: false, error: formatResult.error };
  }

  try {
    const supabase = await createClient();
    const normalized = username.toLowerCase().trim();

    // Check if username exists
    let query = (supabase as any)
      .from("profiles")
      .select("id")
      .eq("username", normalized);

    // Exclude current user when updating
    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data } = await query.single();

    if (data) {
      return { available: false, error: "Username is already taken" };
    }

    return { available: true };
  } catch (error) {
    // No result found = username is available
    return { available: true };
  }
}

/**
 * Update username (with validation)
 */
export async function updateUsername(
  newUsername: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Check availability (excluding current user)
    const availabilityResult = await checkUsernameAvailability(newUsername, user.id);
    if (!availabilityResult.available) {
      return { success: false, error: availabilityResult.error };
    }

    const normalized = newUsername.toLowerCase().trim();

    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        username: normalized,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      console.error("Update username error:", error);
      if (error.code === "23505") {
        return { success: false, error: "Username is already taken" };
      }
      return { success: false, error: "Failed to update username" };
    }

    revalidatePath("/profile/[username]", "page");
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Update username error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface PostWithDetails {
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
  isPinned: boolean;
  isOwn: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasCommented: boolean;
  hasReblogged: boolean;
  tags: Array<{ id: string; name: string }>;
}

/**
 * Get a complete profile page payload in a single server action.
 * Combines: getProfileByUsername + getCurrentProfile + getProfileStats + getProfileLinks + isFollowing + canSendAskTo + getPostsByUser
 *
 * Reduces from 16-18 sequential queries across 3 stages to ~2 stages with maximum parallelism.
 */
export async function getFullProfile(
  username: string,
  options?: { postLimit?: number; postOffset?: number }
): Promise<{
  success: boolean;
  error?: string;
  profile?: Profile;
  currentUserId?: string;
  isOwnProfile?: boolean;
  stats?: { posts: number; followers: number; following: number };
  links?: ProfileLink[];
  isFollowing?: boolean;
  canAsk?: boolean;
  posts?: PostWithDetails[];
  pinnedPost?: PostWithDetails | null;
  totalPosts?: number;
}> {
  try {
    const supabase = await createClient();

    // Stage 1: Fetch profile + auth user in parallel (we need profile.id for everything else)
    const [profileResult, authResult] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select("id, username, display_name, avatar_url, header_url, bio, timezone, show_likes, show_comments, show_followers, show_following, show_sensitive_posts, blur_sensitive_by_default, allow_asks, allow_anonymous_asks, created_at, role")
        .eq("username", username)
        .single(),
      supabase.auth.getUser(),
    ]);

    if (profileResult.error || !profileResult.data) {
      return { success: false, error: "Profile not found" };
    }

    const data = profileResult.data;
    const currentUser = authResult.data?.user;
    const isOwn = currentUser?.id === data.id;

    const profile: Profile = {
      id: data.id,
      username: data.username,
      displayName: data.display_name,
      avatarUrl: data.avatar_url,
      headerUrl: data.header_url,
      bio: data.bio,
      timezone: data.timezone,
      showLikes: data.show_likes,
      showComments: data.show_comments,
      showFollowers: data.show_followers,
      showFollowing: data.show_following,
      showSensitivePosts: data.show_sensitive_posts,
      blurSensitiveByDefault: data.blur_sensitive_by_default,
      allowAsks: data.allow_asks ?? true,
      allowAnonymousAsks: data.allow_anonymous_asks ?? true,
      createdAt: data.created_at,
      role: data.role ?? 0,
    };

    // Stage 2: Fetch EVERYTHING else in parallel - stats, links, posts, follow/ask status
    const postLimit = options?.postLimit || 20;
    const postOffset = options?.postOffset || 0;

    const stage2: Promise<any>[] = [
      // 0: Post count
      (supabase as any)
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("author_id", data.id)
        .eq("status", "published"),
      // 1: Follower count
      (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", data.id),
      // 2: Following count
      (supabase as any)
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", data.id),
      // 3: Profile links
      (supabase as any)
        .from("profile_links")
        .select("id, title, url, sort_order")
        .eq("profile_id", data.id)
        .order("sort_order", { ascending: true }),
      // 4: Posts
      (supabase as any)
        .from("posts")
        .select(`
          id,
          author_id,
          post_type,
          content,
          is_sensitive,
          is_pinned,
          created_at,
          author:author_id (
            username,
            display_name,
            avatar_url,
            role
          )
        `, { count: "exact" })
        .eq("author_id", data.id)
        .eq("status", "published")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .range(postOffset, postOffset + postLimit - 1),
    ];

    // Only check follow/ask status if not own profile and logged in
    if (!isOwn && currentUser) {
      // 5: isFollowing check
      stage2.push(
        (supabase as any)
          .from("follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", data.id)
          .maybeSingle()
      );
      // 6: Block check for canAsk (check if profile owner blocked current user)
      stage2.push(
        (supabase as any)
          .from("blocks")
          .select("id")
          .eq("blocker_id", data.id)
          .eq("blocked_id", currentUser.id)
          .maybeSingle()
      );
    }

    const stage2Results = await Promise.all(stage2);

    const stats = {
      posts: stage2Results[0].count || 0,
      followers: stage2Results[1].count || 0,
      following: stage2Results[2].count || 0,
    };

    const links: ProfileLink[] = (stage2Results[3].data || []).map((link: any) => ({
      id: link.id,
      title: link.title,
      url: link.url,
      sortOrder: link.sort_order,
    }));

    const rawPosts = stage2Results[4].data || [];
    const totalPosts = stage2Results[4].count || 0;

    let followingStatus = false;
    let canAsk = false;
    if (!isOwn && currentUser) {
      followingStatus = !!stage2Results[5]?.data;
      const isBlocked = !!stage2Results[6]?.data;
      // canAsk = profile allows asks AND user is not blocked
      canAsk = (data.allow_asks ?? true) && !isBlocked && data.id !== currentUser.id;
    }

    // Stage 3: Batch fetch post stats (runs count queries in parallel)
    const postIds = rawPosts.map((p: any) => p.id);
    let formattedPosts: PostWithDetails[] = [];
    let pinnedPost: PostWithDetails | null = null;

    if (postIds.length > 0) {
      const postStats = await batchFetchPostStats(supabase, postIds, currentUser?.id);

      formattedPosts = rawPosts.map((post: any) => {
        const formatted: PostWithDetails = {
          id: post.id,
          authorId: post.author_id,
          author: {
            username: post.author?.username || "unknown",
            displayName: post.author?.display_name,
            avatarUrl: post.author?.avatar_url,
            role: post.author?.role || 0,
          },
          postType: post.post_type,
          content: post.content,
          isSensitive: post.is_sensitive,
          isPinned: post.is_pinned,
          isOwn,
          createdAt: formatTimeAgo(post.created_at),
          likeCount: postStats.likeCountMap.get(post.id) || 0,
          commentCount: postStats.commentCountMap.get(post.id) || 0,
          reblogCount: postStats.reblogCountMap.get(post.id) || 0,
          hasLiked: postStats.userLikeSet.has(post.id),
          hasCommented: postStats.userCommentSet.has(post.id),
          hasReblogged: postStats.userReblogSet.has(post.id),
          tags: postStats.tagsMap.get(post.id) || [],
        };
        return formatted;
      });

      // Separate pinned post
      const pinnedIdx = formattedPosts.findIndex((p) => p.isPinned);
      if (pinnedIdx !== -1) {
        pinnedPost = formattedPosts[pinnedIdx];
        formattedPosts = formattedPosts.filter((_, i) => i !== pinnedIdx);
      }
    }

    return {
      success: true,
      profile,
      currentUserId: currentUser?.id,
      isOwnProfile: isOwn,
      stats,
      links,
      isFollowing: followingStatus,
      canAsk,
      posts: formattedPosts,
      pinnedPost,
      totalPosts,
    };
  } catch (error) {
    console.error("Get full profile error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
