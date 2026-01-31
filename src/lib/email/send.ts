import { resend, emailConfig, isEmailConfigured } from "./client";
import {
  MagicLinkEmail,
  WelcomeEmail,
  PasswordResetEmail,
  FollowNotificationEmail,
  LikeNotificationEmail,
  CommentNotificationEmail,
  ReblogNotificationEmail,
  MessageNotificationEmail,
  MentionNotificationEmail,
  DailyDigestEmail,
} from "@/emails";

// Types
interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface BaseEmailOptions {
  to: string;
}

// ============================================================================
// Auth Emails
// ============================================================================

export async function sendMagicLinkEmail(
  options: BaseEmailOptions & {
    magicLink: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send magic link to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.default,
      to: options.to,
      subject: "Sign in to be.vocl",
      react: MagicLinkEmail({
        magicLink: options.magicLink,
        email: options.to,
      }),
    });

    if (error) {
      console.error("Failed to send magic link email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Magic link email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendWelcomeEmail(
  options: BaseEmailOptions & {
    username: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send welcome to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.default,
      to: options.to,
      subject: `Welcome to be.vocl, @${options.username}! 🎉`,
      react: WelcomeEmail({
        username: options.username,
      }),
    });

    if (error) {
      console.error("Failed to send welcome email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Welcome email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendPasswordResetEmail(
  options: BaseEmailOptions & {
    resetLink: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send password reset to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.default,
      to: options.to,
      subject: "Reset your be.vocl password",
      react: PasswordResetEmail({
        resetLink: options.resetLink,
        email: options.to,
      }),
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Password reset email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

// ============================================================================
// Notification Emails
// ============================================================================

export async function sendFollowNotificationEmail(
  options: BaseEmailOptions & {
    followerUsername: string;
    followerAvatarUrl?: string;
    followerBio?: string;
    recipientUsername: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send follow notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject: `@${options.followerUsername} started following you`,
      react: FollowNotificationEmail({
        followerUsername: options.followerUsername,
        followerAvatarUrl: options.followerAvatarUrl,
        followerBio: options.followerBio,
        recipientUsername: options.recipientUsername,
      }),
    });

    if (error) {
      console.error("Failed to send follow notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Follow notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendLikeNotificationEmail(
  options: BaseEmailOptions & {
    likerUsername: string;
    likerAvatarUrl?: string;
    postPreview: string;
    postId: string;
    totalLikes: number;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send like notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject:
        options.totalLikes > 1
          ? `@${options.likerUsername} and others liked your post`
          : `@${options.likerUsername} liked your post`,
      react: LikeNotificationEmail({
        likerUsername: options.likerUsername,
        likerAvatarUrl: options.likerAvatarUrl,
        postPreview: options.postPreview,
        postId: options.postId,
        totalLikes: options.totalLikes,
      }),
    });

    if (error) {
      console.error("Failed to send like notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Like notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendCommentNotificationEmail(
  options: BaseEmailOptions & {
    commenterUsername: string;
    commenterAvatarUrl?: string;
    commentContent: string;
    postPreview: string;
    postId: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send comment notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject: `@${options.commenterUsername} commented on your post`,
      react: CommentNotificationEmail({
        commenterUsername: options.commenterUsername,
        commenterAvatarUrl: options.commenterAvatarUrl,
        commentContent: options.commentContent,
        postPreview: options.postPreview,
        postId: options.postId,
      }),
    });

    if (error) {
      console.error("Failed to send comment notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Comment notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendReblogNotificationEmail(
  options: BaseEmailOptions & {
    rebloggerUsername: string;
    rebloggerAvatarUrl?: string;
    reblogComment?: string;
    postPreview: string;
    postId: string;
    reblogPostId: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send reblog notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject: `@${options.rebloggerUsername} reblogged your post`,
      react: ReblogNotificationEmail({
        rebloggerUsername: options.rebloggerUsername,
        rebloggerAvatarUrl: options.rebloggerAvatarUrl,
        reblogComment: options.reblogComment,
        postPreview: options.postPreview,
        postId: options.postId,
        reblogPostId: options.reblogPostId,
      }),
    });

    if (error) {
      console.error("Failed to send reblog notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Reblog notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendMessageNotificationEmail(
  options: BaseEmailOptions & {
    senderUsername: string;
    senderAvatarUrl?: string;
    messagePreview: string;
    conversationId: string;
    unreadCount: number;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send message notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject:
        options.unreadCount > 1
          ? `${options.unreadCount} new messages from @${options.senderUsername}`
          : `New message from @${options.senderUsername}`,
      react: MessageNotificationEmail({
        senderUsername: options.senderUsername,
        senderAvatarUrl: options.senderAvatarUrl,
        messagePreview: options.messagePreview,
        conversationId: options.conversationId,
        unreadCount: options.unreadCount,
      }),
    });

    if (error) {
      console.error("Failed to send message notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Message notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

export async function sendMentionNotificationEmail(
  options: BaseEmailOptions & {
    mentionerUsername: string;
    mentionerAvatarUrl?: string;
    context: string;
    postId: string;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send mention notification to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject: `@${options.mentionerUsername} mentioned you`,
      react: MentionNotificationEmail({
        mentionerUsername: options.mentionerUsername,
        mentionerAvatarUrl: options.mentionerAvatarUrl,
        context: options.context,
        postId: options.postId,
      }),
    });

    if (error) {
      console.error("Failed to send mention notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Mention notification email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}

interface DigestItem {
  type: "like" | "comment" | "reblog" | "follow" | "mention" | "message";
  count: number;
  actorUsernames: string[];
  postId?: string;
}

export async function sendDailyDigestEmail(
  options: BaseEmailOptions & {
    recipientUsername: string;
    items: DigestItem[];
    totalNotifications: number;
  }
): Promise<SendEmailResult> {
  if (!isEmailConfigured() || !resend) {
    console.log("Email not configured. Would send daily digest to:", options.to);
    return { success: true, messageId: "mock" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: emailConfig.from.notifications,
      to: options.to,
      subject: `Your daily digest: ${options.totalNotifications} notifications`,
      react: DailyDigestEmail({
        recipientUsername: options.recipientUsername,
        items: options.items,
        totalNotifications: options.totalNotifications,
      }),
    });

    if (error) {
      console.error("Failed to send daily digest:", error);
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error("Daily digest email error:", error);
    return { success: false, error: "Failed to send email" };
  }
}
