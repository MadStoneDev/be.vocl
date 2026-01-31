"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { resend, emailConfig, isEmailConfigured } from "@/lib/email";
import { AnnouncementEmail, FounderMessageEmail } from "@/emails";

// ============================================================================
// USER TAGS
// ============================================================================

export interface UserTag {
  id: string;
  name: string;
  description: string | null;
  color: string;
  userCount?: number;
}

export async function getUserTags(): Promise<{
  success: boolean;
  tags?: UserTag[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    // Check if admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: tags, error } = await supabase
      .from("user_tags")
      .select("*")
      .order("name");

    if (error) throw error;

    // Get user counts for each tag
    const tagsWithCounts = await Promise.all(
      (tags || []).map(async (tag) => {
        const { count } = await supabase
          .from("user_tag_assignments")
          .select("*", { count: "exact", head: true })
          .eq("tag_id", tag.id);

        return {
          id: tag.id,
          name: tag.name,
          description: tag.description,
          color: tag.color,
          userCount: count || 0,
        };
      })
    );

    return { success: true, tags: tagsWithCounts };
  } catch (error) {
    console.error("Get user tags error:", error);
    return { success: false, error: "Failed to fetch tags" };
  }
}

export async function createUserTag(
  name: string,
  description?: string,
  color?: string
): Promise<{ success: boolean; tag?: UserTag; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: tag, error } = await supabase
      .from("user_tags")
      .insert({
        name: name.toLowerCase().trim(),
        description: description || null,
        color: color || "#5B9A8B",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Tag already exists" };
      }
      throw error;
    }

    revalidatePath("/admin/email");
    return { success: true, tag };
  } catch (error) {
    console.error("Create user tag error:", error);
    return { success: false, error: "Failed to create tag" };
  }
}

export async function deleteUserTag(tagId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 10) {
      return { success: false, error: "Only admins can delete tags" };
    }

    const { error } = await supabase
      .from("user_tags")
      .delete()
      .eq("id", tagId);

    if (error) throw error;

    revalidatePath("/admin/email");
    return { success: true };
  } catch (error) {
    console.error("Delete user tag error:", error);
    return { success: false, error: "Failed to delete tag" };
  }
}

export async function assignTagToUsers(
  tagId: string,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    const assignments = userIds.map((userId) => ({
      user_id: userId,
      tag_id: tagId,
      assigned_by: user.id,
    }));

    const { error } = await supabase
      .from("user_tag_assignments")
      .upsert(assignments, { onConflict: "user_id,tag_id" });

    if (error) throw error;

    revalidatePath("/admin/email");
    return { success: true };
  } catch (error) {
    console.error("Assign tag error:", error);
    return { success: false, error: "Failed to assign tag" };
  }
}

export async function removeTagFromUsers(
  tagId: string,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { error } = await supabase
      .from("user_tag_assignments")
      .delete()
      .eq("tag_id", tagId)
      .in("user_id", userIds);

    if (error) throw error;

    revalidatePath("/admin/email");
    return { success: true };
  } catch (error) {
    console.error("Remove tag error:", error);
    return { success: false, error: "Failed to remove tag" };
  }
}

// ============================================================================
// EMAIL RECIPIENTS
// ============================================================================

export interface EmailRecipient {
  id: string;
  username: string;
  email: string;
  tags: string[];
}

export async function getEmailRecipients(filter?: {
  tagIds?: string[];
  search?: string;
}): Promise<{ success: boolean; recipients?: EmailRecipient[]; total?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    // Get all profiles
    let query = supabase
      .from("profiles")
      .select("id, username")
      .order("username");

    if (filter?.search) {
      query = query.ilike("username", `%${filter.search}%`);
    }

    const { data: profiles, error: profilesError } = await query;
    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return { success: true, recipients: [], total: 0 };
    }

    // Get user IDs that match tag filter
    let filteredUserIds: string[] | null = null;
    if (filter?.tagIds && filter.tagIds.length > 0) {
      const { data: assignments } = await supabase
        .from("user_tag_assignments")
        .select("user_id")
        .in("tag_id", filter.tagIds);

      filteredUserIds = [...new Set((assignments || []).map((a) => a.user_id))];
    }

    // Get emails for all users
    const recipients: EmailRecipient[] = [];
    for (const p of profiles) {
      if (filteredUserIds && !filteredUserIds.includes(p.id)) {
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(p.id);
      if (!authUser?.user?.email) continue;

      // Get tags for this user
      const { data: userTags } = await supabase
        .from("user_tag_assignments")
        .select("tag:tag_id (name)")
        .eq("user_id", p.id);

      recipients.push({
        id: p.id,
        username: p.username,
        email: authUser.user.email,
        tags: (userTags || []).map((t: any) => t.tag?.name).filter(Boolean),
      });
    }

    return { success: true, recipients, total: recipients.length };
  } catch (error) {
    console.error("Get email recipients error:", error);
    return { success: false, error: "Failed to fetch recipients" };
  }
}

// ============================================================================
// SEND EMAILS
// ============================================================================

export interface SendEmailInput {
  templateType: "announcement" | "founder_message";
  subject: string;
  content: string;
  recipientFilter: {
    type: "all" | "tags" | "users";
    tagIds?: string[];
    userIds?: string[];
  };
  // For announcement
  ctaText?: string;
  ctaUrl?: string;
  // For founder message
  founderName?: string;
  founderTitle?: string;
  founderAvatarUrl?: string;
  signature?: string;
}

export async function sendBulkEmail(input: SendEmailInput): Promise<{
  success: boolean;
  sentCount?: number;
  emailSendId?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    if (!isEmailConfigured()) {
      return { success: false, error: "Email service not configured" };
    }

    // Get recipients based on filter
    let recipients: EmailRecipient[] = [];

    if (input.recipientFilter.type === "all") {
      const result = await getEmailRecipients();
      if (result.success && result.recipients) {
        recipients = result.recipients;
      }
    } else if (input.recipientFilter.type === "tags" && input.recipientFilter.tagIds) {
      const result = await getEmailRecipients({ tagIds: input.recipientFilter.tagIds });
      if (result.success && result.recipients) {
        recipients = result.recipients;
      }
    } else if (input.recipientFilter.type === "users" && input.recipientFilter.userIds) {
      const result = await getEmailRecipients();
      if (result.success && result.recipients) {
        recipients = result.recipients.filter((r) =>
          input.recipientFilter.userIds!.includes(r.id)
        );
      }
    }

    if (recipients.length === 0) {
      return { success: false, error: "No recipients found" };
    }

    // Create email send record
    const { data: emailSend, error: sendError } = await supabase
      .from("email_sends")
      .insert({
        template_type: input.templateType,
        subject: input.subject,
        recipient_count: recipients.length,
        sent_by: user.id,
        recipient_filter: input.recipientFilter,
        custom_content: {
          content: input.content,
          ctaText: input.ctaText,
          ctaUrl: input.ctaUrl,
          founderName: input.founderName,
          founderTitle: input.founderTitle,
          signature: input.signature,
        },
        status: "sending",
      })
      .select("id")
      .single();

    if (sendError) throw sendError;

    // Send emails
    let sentCount = 0;
    const errors: string[] = [];

    for (const recipient of recipients) {
      try {
        let emailResult;

        if (input.templateType === "announcement") {
          emailResult = await resend!.emails.send({
            from: emailConfig.from.notifications,
            to: recipient.email,
            subject: input.subject,
            react: AnnouncementEmail({
              recipientUsername: recipient.username,
              title: input.subject,
              content: input.content,
              ctaText: input.ctaText,
              ctaUrl: input.ctaUrl,
            }),
          });
        } else if (input.templateType === "founder_message") {
          emailResult = await resend!.emails.send({
            from: emailConfig.from.default,
            to: recipient.email,
            subject: input.subject,
            react: FounderMessageEmail({
              recipientUsername: recipient.username,
              subject: input.subject,
              content: input.content,
              founderName: input.founderName || "The Founder",
              founderTitle: input.founderTitle || "Founder, be.vocl",
              founderAvatarUrl: input.founderAvatarUrl,
              signature: input.signature,
              ctaText: input.ctaText,
              ctaUrl: input.ctaUrl,
            }),
          });
        }

        if (emailResult?.error) {
          errors.push(`${recipient.email}: ${emailResult.error.message}`);
        } else {
          sentCount++;
        }

        // Record recipient status
        await supabase.from("email_send_recipients").insert({
          email_send_id: emailSend.id,
          recipient_id: recipient.id,
          email_address: recipient.email,
          status: emailResult?.error ? "failed" : "sent",
          sent_at: emailResult?.error ? null : new Date().toISOString(),
          error: emailResult?.error?.message,
        });
      } catch (err) {
        errors.push(`${recipient.email}: ${String(err)}`);
      }
    }

    // Update email send record
    await supabase
      .from("email_sends")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", emailSend.id);

    revalidatePath("/admin/email");
    return { success: true, sentCount, emailSendId: emailSend.id };
  } catch (error) {
    console.error("Send bulk email error:", error);
    return { success: false, error: "Failed to send emails" };
  }
}

// ============================================================================
// EMAIL HISTORY
// ============================================================================

export interface EmailSendRecord {
  id: string;
  templateType: string;
  subject: string;
  recipientCount: number;
  sentBy: { username: string } | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export async function getEmailHistory(limit = 20): Promise<{
  success: boolean;
  history?: EmailSendRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role < 5) {
      return { success: false, error: "Insufficient permissions" };
    }

    const { data: sends, error } = await supabase
      .from("email_sends")
      .select(`
        id,
        template_type,
        subject,
        recipient_count,
        sent_by,
        status,
        created_at,
        completed_at,
        sender:sent_by (username)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const history: EmailSendRecord[] = (sends || []).map((s: any) => ({
      id: s.id,
      templateType: s.template_type,
      subject: s.subject,
      recipientCount: s.recipient_count,
      sentBy: s.sender,
      status: s.status,
      createdAt: s.created_at,
      completedAt: s.completed_at,
    }));

    return { success: true, history };
  } catch (error) {
    console.error("Get email history error:", error);
    return { success: false, error: "Failed to fetch history" };
  }
}
