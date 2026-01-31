"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendWelcomeEmail,
  sendFollowNotificationEmail,
  sendLikeNotificationEmail,
  sendCommentNotificationEmail,
  sendReblogNotificationEmail,
  sendMessageNotificationEmail,
  sendMentionNotificationEmail,
} from "@/lib/email";

type NotificationType = "like" | "comment" | "reblog" | "follow" | "mention" | "message";

interface EmailPreferences {
  enabled: boolean;
  frequency: "immediate" | "daily" | "off";
  preferences: {
    likes: boolean;
    comments: boolean;
    reblogs: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
  };
}

/**
 * Get user's email preferences
 */
async function getEmailPreferences(userId: string): Promise<EmailPreferences | null> {
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
      // Default preferences if not found
      return {
        enabled: true,
        frequency: "immediate",
        preferences: {
          likes: false,
          comments: true,
          reblogs: false,
          follows: true,
          mentions: true,
          messages: true,
        },
      };
    }

    const frequency = (profile.email_frequency as "immediate" | "daily" | "off") || "immediate";

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

/**
 * Check if we should send an email based on user preferences
 */
async function shouldSendEmail(userId: string, type: NotificationType): Promise<{
  send: boolean;
  queueForDigest: boolean;
}> {
  const prefs = await getEmailPreferences(userId);

  if (!prefs || !prefs.enabled) {
    return { send: false, queueForDigest: false };
  }

  const typeToPreference: Record<NotificationType, keyof EmailPreferences["preferences"]> = {
    like: "likes",
    comment: "comments",
    reblog: "reblogs",
    follow: "follows",
    mention: "mentions",
    message: "messages",
  };

  const prefKey = typeToPreference[type];
  if (!prefs.preferences[prefKey]) {
    return { send: false, queueForDigest: false };
  }

  if (prefs.frequency === "daily") {
    return { send: false, queueForDigest: true };
  }

  return { send: true, queueForDigest: false };
}

/**
 * Queue notification for daily digest
 */
async function queueForDigest(
  recipientId: string,
  type: NotificationType,
  data: {
    actorId?: string;
    postId?: string;
    commentId?: string;
    messagePreview?: string;
    conversationId?: string;
  }
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("pending_digest_notifications").insert({
      recipient_id: recipientId,
      notification_type: type,
      actor_id: data.actorId,
      post_id: data.postId,
      comment_id: data.commentId,
      message_preview: data.messagePreview,
      conversation_id: data.conversationId,
    });
  } catch (error) {
    console.error("Failed to queue digest notification:", error);
  }
}

/**
 * Check message email throttling (1 email per hour per sender)
 */
async function canSendMessageEmail(
  recipientId: string,
  senderId: string,
  conversationId: string
): Promise<{ canSend: boolean; isNewConversation: boolean }> {
  try {
    const supabase = await createClient();

    const { data: tracking } = await supabase
      .from("message_email_tracking")
      .select("last_email_sent_at, is_new_conversation")
      .eq("recipient_id", recipientId)
      .eq("sender_id", senderId)
      .single();

    if (!tracking) {
      // First message from this sender - this is a new conversation
      return { canSend: true, isNewConversation: true };
    }

    // Check if 1 hour has passed since last email
    const lastSent = new Date(tracking.last_email_sent_at);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (lastSent < hourAgo) {
      return { canSend: true, isNewConversation: false };
    }

    // Throttled - don't send
    return { canSend: false, isNewConversation: false };
  } catch {
    return { canSend: true, isNewConversation: true };
  }
}

/**
 * Update message email tracking
 */
async function updateMessageEmailTracking(
  recipientId: string,
  senderId: string,
  conversationId: string,
  isNewConversation: boolean
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase
      .from("message_email_tracking")
      .upsert({
        recipient_id: recipientId,
        sender_id: senderId,
        conversation_id: conversationId,
        last_email_sent_at: new Date().toISOString(),
        is_new_conversation: isNewConversation,
      }, {
        onConflict: "recipient_id,sender_id",
      });
  } catch (error) {
    console.error("Failed to update message email tracking:", error);
  }
}

/**
 * Get user email from auth
 */
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    return authUser?.user?.email || null;
  } catch {
    return null;
  }
}

/**
 * Send welcome email after user signs up
 */
export async function sendWelcomeNotification(
  userId: string,
  username: string,
  email: string
): Promise<void> {
  try {
    await sendWelcomeEmail({
      to: email,
      username,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
  }
}

/**
 * Send follow notification email
 */
export async function sendFollowNotification(
  followerId: string,
  followingId: string
): Promise<void> {
  try {
    if (followerId === followingId) return;

    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(followingId, "follow");

    if (shouldQueue) {
      await queueForDigest(followingId, "follow", { actorId: followerId });
      return;
    }

    if (!send) return;

    const supabase = await createClient();

    const { data: follower } = await supabase
      .from("profiles")
      .select("username, avatar_url, bio")
      .eq("id", followerId)
      .single();

    const { data: following } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", followingId)
      .single();

    if (!follower || !following) return;

    const email = await getUserEmail(followingId);
    if (!email) return;

    await sendFollowNotificationEmail({
      to: email,
      followerUsername: follower.username,
      followerAvatarUrl: follower.avatar_url,
      followerBio: follower.bio,
      recipientUsername: following.username,
    });
  } catch (error) {
    console.error("Failed to send follow notification email:", error);
  }
}

/**
 * Send like notification email
 */
export async function sendLikeNotification(
  likerId: string,
  postId: string,
  postAuthorId: string
): Promise<void> {
  try {
    if (likerId === postAuthorId) return;

    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(postAuthorId, "like");

    if (shouldQueue) {
      await queueForDigest(postAuthorId, "like", { actorId: likerId, postId });
      return;
    }

    if (!send) return;

    const supabase = await createClient();

    const { data: liker } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", likerId)
      .single();

    const { data: post } = await supabase
      .from("posts")
      .select("content")
      .eq("id", postId)
      .single();

    const { count: totalLikes } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (!liker || !post) return;

    const email = await getUserEmail(postAuthorId);
    if (!email) return;

    let postPreview = "Your post";
    if (post.content?.plain) {
      postPreview = post.content.plain.slice(0, 100);
    } else if (post.content?.html) {
      postPreview = post.content.html.replace(/<[^>]*>/g, "").slice(0, 100);
    }

    await sendLikeNotificationEmail({
      to: email,
      likerUsername: liker.username,
      likerAvatarUrl: liker.avatar_url,
      postPreview,
      postId,
      totalLikes: totalLikes || 1,
    });
  } catch (error) {
    console.error("Failed to send like notification email:", error);
  }
}

/**
 * Send comment notification email
 */
export async function sendCommentNotification(
  commenterId: string,
  postId: string,
  postAuthorId: string,
  commentContent: string,
  commentId?: string
): Promise<void> {
  try {
    if (commenterId === postAuthorId) return;

    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(postAuthorId, "comment");

    if (shouldQueue) {
      await queueForDigest(postAuthorId, "comment", { actorId: commenterId, postId, commentId });
      return;
    }

    if (!send) return;

    const supabase = await createClient();

    const { data: commenter } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", commenterId)
      .single();

    const { data: post } = await supabase
      .from("posts")
      .select("content")
      .eq("id", postId)
      .single();

    if (!commenter || !post) return;

    const email = await getUserEmail(postAuthorId);
    if (!email) return;

    let postPreview = "Your post";
    if (post.content?.plain) {
      postPreview = post.content.plain.slice(0, 100);
    } else if (post.content?.html) {
      postPreview = post.content.html.replace(/<[^>]*>/g, "").slice(0, 100);
    }

    const cleanComment = commentContent.replace(/<[^>]*>/g, "").slice(0, 200);

    await sendCommentNotificationEmail({
      to: email,
      commenterUsername: commenter.username,
      commenterAvatarUrl: commenter.avatar_url,
      commentContent: cleanComment,
      postPreview,
      postId,
    });
  } catch (error) {
    console.error("Failed to send comment notification email:", error);
  }
}

/**
 * Send reblog notification email
 */
export async function sendReblogNotification(
  rebloggerId: string,
  originalPostId: string,
  originalAuthorId: string,
  reblogPostId: string,
  reblogComment?: string
): Promise<void> {
  try {
    if (rebloggerId === originalAuthorId) return;

    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(originalAuthorId, "reblog");

    if (shouldQueue) {
      await queueForDigest(originalAuthorId, "reblog", { actorId: rebloggerId, postId: originalPostId });
      return;
    }

    if (!send) return;

    const supabase = await createClient();

    const { data: reblogger } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", rebloggerId)
      .single();

    const { data: post } = await supabase
      .from("posts")
      .select("content")
      .eq("id", originalPostId)
      .single();

    if (!reblogger || !post) return;

    const email = await getUserEmail(originalAuthorId);
    if (!email) return;

    let postPreview = "Your post";
    if (post.content?.plain) {
      postPreview = post.content.plain.slice(0, 100);
    } else if (post.content?.html) {
      postPreview = post.content.html.replace(/<[^>]*>/g, "").slice(0, 100);
    }

    const cleanComment = reblogComment
      ? reblogComment.replace(/<[^>]*>/g, "").slice(0, 200)
      : undefined;

    await sendReblogNotificationEmail({
      to: email,
      rebloggerUsername: reblogger.username,
      rebloggerAvatarUrl: reblogger.avatar_url,
      reblogComment: cleanComment,
      postPreview,
      postId: originalPostId,
      reblogPostId,
    });
  } catch (error) {
    console.error("Failed to send reblog notification email:", error);
  }
}

/**
 * Send message notification email (with throttling)
 */
export async function sendMessageNotification(
  senderId: string,
  recipientId: string,
  conversationId: string,
  messageContent: string
): Promise<void> {
  try {
    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(recipientId, "message");

    if (shouldQueue) {
      await queueForDigest(recipientId, "message", {
        actorId: senderId,
        messagePreview: messageContent.slice(0, 150),
        conversationId,
      });
      return;
    }

    if (!send) return;

    // Check throttling
    const { canSend, isNewConversation } = await canSendMessageEmail(
      recipientId,
      senderId,
      conversationId
    );

    if (!canSend) {
      // Throttled - skip this email
      return;
    }

    const supabase = await createClient();

    const { data: sender } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", senderId)
      .single();

    if (!sender) return;

    const email = await getUserEmail(recipientId);
    if (!email) return;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .eq("sender_id", senderId)
      .eq("is_deleted", false);

    await sendMessageNotificationEmail({
      to: email,
      senderUsername: sender.username,
      senderAvatarUrl: sender.avatar_url,
      messagePreview: messageContent.slice(0, 150),
      conversationId,
      unreadCount: unreadCount || 1,
    });

    // Update tracking
    await updateMessageEmailTracking(recipientId, senderId, conversationId, isNewConversation);
  } catch (error) {
    console.error("Failed to send message notification email:", error);
  }
}

/**
 * Send mention notification email
 */
export async function sendMentionNotification(
  mentionerId: string,
  mentionedUserId: string,
  postId: string,
  context: string
): Promise<void> {
  try {
    if (mentionerId === mentionedUserId) return;

    const { send, queueForDigest: shouldQueue } = await shouldSendEmail(mentionedUserId, "mention");

    if (shouldQueue) {
      await queueForDigest(mentionedUserId, "mention", { actorId: mentionerId, postId });
      return;
    }

    if (!send) return;

    const supabase = await createClient();

    const { data: mentioner } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", mentionerId)
      .single();

    if (!mentioner) return;

    const email = await getUserEmail(mentionedUserId);
    if (!email) return;

    const cleanContext = context.replace(/<[^>]*>/g, "").slice(0, 200);

    await sendMentionNotificationEmail({
      to: email,
      mentionerUsername: mentioner.username,
      mentionerAvatarUrl: mentioner.avatar_url,
      context: cleanContext,
      postId,
    });
  } catch (error) {
    console.error("Failed to send mention notification email:", error);
  }
}
