"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type EmailFrequency = "immediate" | "daily" | "off";

export interface NotificationSettings {
  emailLikes: boolean;
  emailComments: boolean;
  emailReblogs: boolean;
  emailFollows: boolean;
  emailMentions: boolean;
  emailMessages: boolean;
  emailFrequency: EmailFrequency;
}

const defaultSettings: NotificationSettings = {
  emailLikes: false,
  emailComments: true,
  emailReblogs: false,
  emailFollows: true,
  emailMentions: true,
  emailMessages: true,
  emailFrequency: "immediate",
};

/**
 * Get current user's notification settings
 */
export async function getNotificationSettings(): Promise<{
  success: boolean;
  settings?: NotificationSettings;
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

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        email_likes,
        email_comments,
        email_reblogs,
        email_follows,
        email_mentions,
        email_messages,
        email_frequency
      `)
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Get notification settings error:", error);
      return { success: false, error: "Failed to load settings" };
    }

    // Map database columns to settings object
    const settings: NotificationSettings = {
      emailLikes: profile?.email_likes ?? defaultSettings.emailLikes,
      emailComments: profile?.email_comments ?? defaultSettings.emailComments,
      emailReblogs: profile?.email_reblogs ?? defaultSettings.emailReblogs,
      emailFollows: profile?.email_follows ?? defaultSettings.emailFollows,
      emailMentions: profile?.email_mentions ?? defaultSettings.emailMentions,
      emailMessages: profile?.email_messages ?? defaultSettings.emailMessages,
      emailFrequency: (profile?.email_frequency as EmailFrequency) ?? defaultSettings.emailFrequency,
    };

    return { success: true, settings };
  } catch (error) {
    console.error("Get notification settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Update notification settings
 */
export async function updateNotificationSettings(
  settings: Partial<NotificationSettings>
): Promise<{
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

    // Map settings to database columns
    const updates: Record<string, any> = {};
    if (settings.emailLikes !== undefined) updates.email_likes = settings.emailLikes;
    if (settings.emailComments !== undefined) updates.email_comments = settings.emailComments;
    if (settings.emailReblogs !== undefined) updates.email_reblogs = settings.emailReblogs;
    if (settings.emailFollows !== undefined) updates.email_follows = settings.emailFollows;
    if (settings.emailMentions !== undefined) updates.email_mentions = settings.emailMentions;
    if (settings.emailMessages !== undefined) updates.email_messages = settings.emailMessages;
    if (settings.emailFrequency !== undefined) updates.email_frequency = settings.emailFrequency;

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (error) {
      console.error("Update notification settings error:", error);
      return { success: false, error: "Failed to save settings" };
    }

    revalidatePath("/settings/notifications");
    return { success: true };
  } catch (error) {
    console.error("Update notification settings error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get user's email preferences (for internal use by email sending functions)
 */
export async function getUserEmailPreferences(userId: string): Promise<{
  enabled: boolean;
  frequency: EmailFrequency;
  preferences: {
    likes: boolean;
    comments: boolean;
    reblogs: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
  };
} | null> {
  try {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(`
        email_likes,
        email_comments,
        email_reblogs,
        email_follows,
        email_mentions,
        email_messages,
        email_frequency
      `)
      .eq("id", userId)
      .single();

    if (error || !profile) {
      return null;
    }

    const frequency = (profile.email_frequency as EmailFrequency) || "immediate";

    return {
      enabled: frequency !== "off",
      frequency,
      preferences: {
        likes: profile.email_likes ?? false,
        comments: profile.email_comments ?? true,
        reblogs: profile.email_reblogs ?? false,
        follows: profile.email_follows ?? true,
        mentions: profile.email_mentions ?? true,
        messages: profile.email_messages ?? true,
      },
    };
  } catch {
    return null;
  }
}
