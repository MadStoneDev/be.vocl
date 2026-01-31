"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { validateUsernameFormat } from "@/lib/validation";

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
  createdAt: string;
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
    const supabase = await createServerClient();

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
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
        createdAt: data.created_at,
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
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
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
        createdAt: data.created_at,
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
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();

    const { data, error } = await (supabase as any)
      .from("profile_links")
      .select("*")
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
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
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
    const supabase = await createServerClient();
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
 * Get profile stats (posts, followers, following counts)
 */
export async function getProfileStats(
  profileId: string
): Promise<{
  success: boolean;
  stats?: { posts: number; followers: number; following: number };
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Get post count
    const { count: postsCount } = await (supabase as any)
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", profileId)
      .eq("status", "published");

    // Get followers count
    const { count: followersCount } = await (supabase as any)
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);

    // Get following count
    const { count: followingCount } = await (supabase as any)
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profileId);

    return {
      success: true,
      stats: {
        posts: postsCount || 0,
        followers: followersCount || 0,
        following: followingCount || 0,
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
}): Promise<ProfileResult> {
  try {
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
    const supabase = await createServerClient();
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
