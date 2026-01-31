"use server";

import { createClient } from "@/lib/supabase/server";
import {
  sendWelcomeEmail,
  sendFollowNotificationEmail,
  sendLikeNotificationEmail,
  sendCommentNotificationEmail,
  sendReblogNotificationEmail,
  sendMessageNotificationEmail,
} from "@/lib/email";

// Helper to get user's email preferences (future: check notification settings)
async function shouldSendEmail(userId: string, type: string): Promise<boolean> {
  // TODO: Check user's email notification preferences from profiles table
  // For now, always send
  return true;
}

// Helper to get user email from profile
async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!data) return null;

    // Get email from auth.users via service role
    // Note: In production, you'd store email preferences in profiles
    // For now, we'll get it from the auth user
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
    if (!(await shouldSendEmail(followingId, "follow"))) return;

    const supabase = await createClient();

    // Get follower info
    const { data: follower } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url, bio")
      .eq("id", followerId)
      .single();

    // Get following user info
    const { data: following } = await (supabase as any)
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
    if (likerId === postAuthorId) return; // Don't notify yourself
    if (!(await shouldSendEmail(postAuthorId, "like"))) return;

    const supabase = await createClient();

    // Get liker info
    const { data: liker } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", likerId)
      .single();

    // Get post info
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("content")
      .eq("id", postId)
      .single();

    // Get total likes on this post
    const { count: totalLikes } = await (supabase as any)
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId);

    if (!liker || !post) return;

    const email = await getUserEmail(postAuthorId);
    if (!email) return;

    // Extract text preview from post content
    let postPreview = "Your post";
    if (post.content?.text) {
      postPreview = post.content.text.slice(0, 100);
    } else if (typeof post.content === "string") {
      postPreview = post.content.slice(0, 100);
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
  commentContent: string
): Promise<void> {
  try {
    if (commenterId === postAuthorId) return; // Don't notify yourself
    if (!(await shouldSendEmail(postAuthorId, "comment"))) return;

    const supabase = await createClient();

    // Get commenter info
    const { data: commenter } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", commenterId)
      .single();

    // Get post info
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("content")
      .eq("id", postId)
      .single();

    if (!commenter || !post) return;

    const email = await getUserEmail(postAuthorId);
    if (!email) return;

    // Extract text preview from post content
    let postPreview = "Your post";
    if (post.content?.text) {
      postPreview = post.content.text.slice(0, 100);
    } else if (typeof post.content === "string") {
      postPreview = post.content.slice(0, 100);
    }

    // Strip HTML from comment
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
    if (rebloggerId === originalAuthorId) return; // Don't notify yourself
    if (!(await shouldSendEmail(originalAuthorId, "reblog"))) return;

    const supabase = await createClient();

    // Get reblogger info
    const { data: reblogger } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", rebloggerId)
      .single();

    // Get original post info
    const { data: post } = await (supabase as any)
      .from("posts")
      .select("content")
      .eq("id", originalPostId)
      .single();

    if (!reblogger || !post) return;

    const email = await getUserEmail(originalAuthorId);
    if (!email) return;

    // Extract text preview from post content
    let postPreview = "Your post";
    if (post.content?.text) {
      postPreview = post.content.text.slice(0, 100);
    } else if (typeof post.content === "string") {
      postPreview = post.content.slice(0, 100);
    }

    // Strip HTML from reblog comment if present
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
 * Send message notification email
 */
export async function sendMessageNotification(
  senderId: string,
  recipientId: string,
  conversationId: string,
  messageContent: string
): Promise<void> {
  try {
    if (!(await shouldSendEmail(recipientId, "message"))) return;

    const supabase = await createClient();

    // Get sender info
    const { data: sender } = await (supabase as any)
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", senderId)
      .single();

    if (!sender) return;

    const email = await getUserEmail(recipientId);
    if (!email) return;

    // Get unread count
    const { count: unreadCount } = await (supabase as any)
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
  } catch (error) {
    console.error("Failed to send message notification email:", error);
  }
}
