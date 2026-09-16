"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimiters } from "@/lib/rate-limit";
import type { TablesInsert } from "@/types/database";

/**
 * SECURITY (SEC-13): sanitize raw values before interpolating them into a
 * PostgREST filter string (`.or(...)`). PostgREST treats certain characters as
 * reserved syntax inside filter expressions, so unsanitized input allows filter
 * injection. Strip the reserved characters (`,` `(` `)` `*` `:`) and any
 * leading/trailing `.` separators.
 */
function sanitizeFilterTerm(term: string): string {
  return term
    .replace(/[,()*:]/g, "")
    .replace(/^\.+|\.+$/g, "")
    .trim();
}

interface MessageResult {
  success: boolean;
  messageId?: string;
  conversationId?: string;
  error?: string;
}

/** Aggregated reaction for a message: one entry per distinct emoji. */
interface MessageReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

/** Minimal context for the message a reply points at. */
interface ReplyContext {
  id: string;
  senderId: string;
  senderName?: string;
  /** Short text/preview snippet of the replied-to message. */
  preview: string;
}

/** Compact preview of a post embedded ("shared") in a message. */
export interface SharedPostPreview {
  id: string;
  postType: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  /** Best-effort text snippet (plain body / caption / poll question). */
  excerpt: string;
  /** First image/thumbnail URL, when the post has one. */
  thumbnailUrl?: string;
  isSensitive: boolean;
}

interface Message {
  id: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  /** Duration in seconds for audio (voice note) messages. */
  mediaDuration?: number;
  senderId: string;
  isRead: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  /** Raw ISO 8601 timestamp (DB created_at). Format on the client. */
  createdAt: string;
  /** Aggregated emoji reactions on this message. */
  reactions: MessageReaction[];
  /** Context of the message this one replies to, if any. */
  replyTo?: ReplyContext;
  /** A post embedded in this message, if any (resolved for display). */
  sharedPost?: SharedPostPreview;
}

/** Strip HTML tags and collapse whitespace into a short plain-text snippet. */
function toExcerpt(raw: string | null | undefined, max = 140): string {
  if (!raw) return "";
  const text = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/** Derive a compact preview from a post row (JSONB content varies by type). */
function shapeSharedPost(
  post: { id: string; post_type: string; content: any; is_sensitive: boolean | null },
  author: { username: string; avatar_url: string | null } | undefined
): SharedPostPreview {
  const c = post.content ?? {};
  const excerpt =
    toExcerpt(c.plain) ||
    toExcerpt(c.caption_html) ||
    toExcerpt(c.question) ||
    toExcerpt(c.html);
  const thumbnailUrl: string | undefined =
    (Array.isArray(c.urls) && c.urls[0]) ||
    (Array.isArray(c.items) && c.items[0]?.url) ||
    c.url ||
    c.album_art_url ||
    undefined;
  return {
    id: post.id,
    postType: post.post_type,
    authorUsername: author?.username ?? "someone",
    authorAvatarUrl: author?.avatar_url ?? undefined,
    excerpt,
    thumbnailUrl,
    isSensitive: Boolean(post.is_sensitive),
  };
}

interface Conversation {
  id: string;
  /** Group conversation (vs a 1:1 DM). */
  isGroup?: boolean;
  /** Group name (null for DMs). */
  name?: string | null;
  /** The peer for a DM, or the first other member for a group (fallback avatar). */
  participant: {
    id: string;
    username: string;
    avatarUrl?: string;
    isOnline?: boolean;
  };
  /** Every OTHER member of the conversation. */
  participants?: Array<{ id: string; username: string; avatarUrl?: string }>;
  lastMessage?: {
    content: string;
    senderId: string;
    /** Raw ISO 8601 timestamp (DB created_at). Format on the client. */
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  /** Whether the current user has muted this conversation. */
  isMuted?: boolean;
  /** A pending message request (DM from a non-follower, awaiting acceptance). */
  isRequest?: boolean;
  /** True when the CURRENT user is the one who opened the pending request. */
  requestedByMe?: boolean;
}

/**
 * Get all conversations for current user
 * Optimized: Uses batch queries instead of N+1
 */
export async function getConversations(opts?: {
  /** When true, return ONLY incoming pending requests instead of the inbox. */
  requestsOnly?: boolean;
}): Promise<{
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}> {
  const requestsOnly = opts?.requestsOnly ?? false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Get conversations where user is a participant
    const { data: participations, error: partError } = await supabase
      .from("conversation_participants")
      .select(
        `
        conversation_id,
        last_read_at,
        is_muted,
        conversation:conversation_id (
          id,
          updated_at
        )
      `
      )
      .eq("profile_id", user.id);

    if (partError) {
      console.error("Get conversations error:", partError);
      return { success: false, error: "Failed to fetch conversations" };
    }

    if (!participations || participations.length === 0) {
      return { success: true, conversations: [] };
    }

    const conversationIds = participations.map((p: any) => p.conversation_id);

    // Batch fetch: Get all other participants for all conversations at once
    const { data: allParticipants } = await supabase
      .from("conversation_participants")
      .select(
        `
        conversation_id,
        profile:profile_id (
          id,
          username,
          avatar_url
        )
      `
      )
      .in("conversation_id", conversationIds)
      .neq("profile_id", user.id);

    // Build lookup maps for O(1) access. A conversation can have many other
    // members (groups), so map to an ARRAY, not a single profile.
    const participantMap = new Map<string, any[]>();
    for (const p of allParticipants || []) {
      if (p.profile) {
        const arr = participantMap.get(p.conversation_id) ?? [];
        arr.push(p.profile);
        participantMap.set(p.conversation_id, arr);
      }
    }

    // Group metadata (is_group / name / request state) for these conversations.
    const { data: convRows } = await supabase
      .from("conversations")
      .select("id, is_group, name, is_request, requested_by")
      .in("id", conversationIds);
    const convMetaMap = new Map<
      string,
      { is_group: boolean; name: string | null; is_request: boolean; requested_by: string | null }
    >();
    for (const c of convRows ?? []) {
      convMetaMap.set(c.id, {
        is_group: c.is_group,
        name: c.name,
        is_request: c.is_request ?? false,
        requested_by: c.requested_by ?? null,
      });
    }

    const lastMessageMap = new Map<string, any>();
    const unreadCountMap = new Map<string, number>();

    // Fast path: one row per conversation (latest message + unread) via RPC —
    // avoids pulling every message across every conversation into memory.
    const { data: previews, error: rpcError } = await supabase.rpc(
      "get_conversation_previews"
    );

    if (!rpcError && Array.isArray(previews)) {
      for (const p of previews as Array<{
        conversation_id: string;
        last_content: string | null;
        last_sender_id: string | null;
        last_created_at: string | null;
        unread_count: number | string | null;
      }>) {
        if (p.last_created_at) {
          lastMessageMap.set(p.conversation_id, {
            content: p.last_content,
            sender_id: p.last_sender_id,
            created_at: p.last_created_at,
          });
        }
        unreadCountMap.set(p.conversation_id, Number(p.unread_count) || 0);
      }
    } else {
      // Fallback (e.g. RPC not migrated yet): the original unbounded approach.
      const { data: allMessages } = await supabase
        .from("messages")
        .select("id, conversation_id, content, sender_id, created_at")
        .in("conversation_id", conversationIds)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      const { data: unreadMessages } = await supabase
        .from("messages")
        .select("conversation_id, created_at")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id);

      for (const msg of allMessages || []) {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      }

      const lastReadMap = new Map<string, string>();
      for (const p of participations) {
        lastReadMap.set(p.conversation_id, p.last_read_at || "1970-01-01");
      }
      for (const msg of unreadMessages || []) {
        const lastRead = lastReadMap.get(msg.conversation_id) || "1970-01-01";
        if (msg.created_at && new Date(msg.created_at) > new Date(lastRead)) {
          unreadCountMap.set(
            msg.conversation_id,
            (unreadCountMap.get(msg.conversation_id) || 0) + 1
          );
        }
      }
    }

    // Build conversations array
    const conversations: Conversation[] = [];
    for (const part of participations) {
      const others = participantMap.get(part.conversation_id) ?? [];
      const meta = convMetaMap.get(part.conversation_id);
      const isGroup = meta?.is_group ?? false;
      // A DM with no resolvable peer is broken; a group can legitimately stand
      // even if it momentarily has no other members.
      if (others.length === 0 && !isGroup) continue;

      // Request routing: an incoming request (someone else opened it) shows only
      // in the Requests inbox; everything else (my own outgoing requests included)
      // shows in the normal inbox.
      const isRequest = Boolean(meta?.is_request && meta?.requested_by);
      const requestedByMe = isRequest && meta?.requested_by === user.id;
      const isIncomingRequest = isRequest && !requestedByMe;
      if (requestsOnly ? !isIncomingRequest : isIncomingRequest) continue;

      const primary = others[0];
      const lastMessage = lastMessageMap.get(part.conversation_id);
      const lastReadAt = part.last_read_at;

      conversations.push({
        id: part.conversation_id,
        isGroup,
        name: meta?.name ?? null,
        participant: {
          id: primary?.id ?? part.conversation_id,
          username: primary?.username ?? (meta?.name || "Group"),
          avatarUrl: primary?.avatar_url,
          isOnline: false,
        },
        participants: others.map((o) => ({
          id: o.id,
          username: o.username,
          avatarUrl: o.avatar_url,
        })),
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              senderId: lastMessage.sender_id,
              // Expose the raw ISO timestamp; the client formats it (<TimeAgo />).
              createdAt: lastMessage.created_at,
              isRead: lastMessage.sender_id === user.id ||
                     Boolean(lastReadAt && new Date(lastMessage.created_at) <= new Date(lastReadAt)),
            }
          : undefined,
        unreadCount: unreadCountMap.get(part.conversation_id) || 0,
        isMuted: part.is_muted ?? false,
        isRequest,
        requestedByMe,
      });
    }

    // Sort by most recent message
    conversations.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return (
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime()
      );
    });

    return { success: true, conversations };
  } catch (error) {
    console.error("Get conversations error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Resolve a single shared-post preview (used by the realtime path so a live-
 * received shared post shows its card without a full reload).
 */
export async function getSharedPostPreview(
  postId: string
): Promise<{ success: boolean; post?: SharedPostPreview }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const { data: post } = await supabase
      .from("posts")
      .select("id, author_id, post_type, content, is_sensitive")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return { success: false };

    const { data: author } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", post.author_id)
      .maybeSingle();

    return { success: true, post: shapeSharedPost(post, author ?? undefined) };
  } catch (error) {
    console.error("Get shared post preview error:", error);
    return { success: false };
  }
}

/**
 * Incoming message requests: DMs opened by someone the current user does not
 * follow, awaiting acceptance. Thin wrapper over getConversations.
 */
export async function getMessageRequests(): Promise<{
  success: boolean;
  conversations?: Conversation[];
  error?: string;
}> {
  return getConversations({ requestsOnly: true });
}

/**
 * Accept a pending message request — moves the conversation into the normal
 * inbox for both people. Only the recipient (not the initiator) can accept.
 */
export async function acceptMessageRequest(
  conversationId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    // Must be a participant, the conversation must be a pending request, and the
    // caller must NOT be the one who opened it.
    const { data: isParticipant } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!isParticipant) return { success: false, error: "Access denied" };

    const { data: conv } = await supabase
      .from("conversations")
      .select("is_request, requested_by")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv?.is_request) return { success: true, conversationId }; // already accepted
    if (conv.requested_by === user.id) {
      return { success: false, error: "You opened this request." };
    }

    // Clear the request flag with the admin client (no members-can-update policy
    // on conversations; startConversation already relies on admin for writes).
    const admin = createAdminClient();
    const { error } = await admin
      .from("conversations")
      .update({ is_request: false, requested_by: null })
      .eq("id", conversationId);
    if (error) return { success: false, error: "Failed to accept request" };

    revalidatePath("/");
    return { success: true, conversationId };
  } catch (error) {
    console.error("Accept request error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Decline a pending message request — deletes the conversation (cascades its
 * participants and messages). Only the recipient can decline.
 */
export async function declineMessageRequest(
  conversationId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { data: isParticipant } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!isParticipant) return { success: false, error: "Access denied" };

    const { data: conv } = await supabase
      .from("conversations")
      .select("is_request, requested_by")
      .eq("id", conversationId)
      .maybeSingle();
    if (!conv?.is_request || conv.requested_by === user.id) {
      return { success: false, error: "Nothing to decline." };
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("conversations")
      .delete()
      .eq("id", conversationId);
    if (error) return { success: false, error: "Failed to decline request" };

    revalidatePath("/");
    return { success: true, conversationId };
  } catch (error) {
    console.error("Decline request error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  limit = 50,
  before?: string
): Promise<{
  success: boolean;
  messages?: Message[];
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

    // Verify user is participant
    const { data: isParticipant } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .single();

    if (!isParticipant) {
      return { success: false, error: "Access denied" };
    }

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: "Failed to fetch messages" };
    }

    // Mark as read
    await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    const rows: any[] = (data || []).slice().reverse();
    const messageIds = rows.map((m) => m.id);

    // --- Reactions: one query for all loaded messages, aggregated in JS. ---
    const reactionMap = new Map<string, MessageReaction[]>();
    if (messageIds.length > 0) {
      const { data: reactionRows } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, user_id")
        .in("message_id", messageIds);

      // emoji -> { count, reactedByMe } keyed first by message id
      const perMessage = new Map<string, Map<string, MessageReaction>>();
      for (const r of reactionRows || []) {
        let byEmoji = perMessage.get(r.message_id);
        if (!byEmoji) {
          byEmoji = new Map();
          perMessage.set(r.message_id, byEmoji);
        }
        const entry = byEmoji.get(r.emoji);
        if (entry) {
          entry.count += 1;
          if (r.user_id === user.id) entry.reactedByMe = true;
        } else {
          byEmoji.set(r.emoji, {
            emoji: r.emoji,
            count: 1,
            reactedByMe: r.user_id === user.id,
          });
        }
      }
      for (const [mid, byEmoji] of perMessage) {
        reactionMap.set(mid, Array.from(byEmoji.values()));
      }
    }

    // --- Reply context: look up the replied-to messages in one query. ---
    const replyMap = new Map<string, ReplyContext>();
    const replyIds = Array.from(
      new Set(rows.map((m) => m.reply_to_id).filter(Boolean))
    );
    if (replyIds.length > 0) {
      const { data: repliedRows } = await supabase
        .from("messages")
        .select("id, content, media_type, sender_id, is_deleted")
        .in("id", replyIds);

      // Resolve sender usernames for the replied-to messages.
      const replySenderIds = Array.from(
        new Set((repliedRows || []).map((r: any) => r.sender_id))
      );
      const nameMap = new Map<string, string>();
      if (replySenderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", replySenderIds);
        for (const p of profiles || []) nameMap.set(p.id, p.username);
      }

      for (const r of repliedRows || []) {
        const preview = r.is_deleted
          ? "Deleted message"
          : r.content
            ? r.content.slice(0, 120)
            : r.media_type === "audio"
              ? "Voice message"
              : r.media_type === "image"
                ? "Photo"
                : r.media_type === "video"
                  ? "Video"
                  : "Attachment";
        replyMap.set(r.id, {
          id: r.id,
          senderId: r.sender_id,
          senderName: nameMap.get(r.sender_id),
          preview,
        });
      }
    }

    // --- Shared posts: resolve embedded posts (+ authors) in two queries. ---
    const sharedPostMap = new Map<string, SharedPostPreview>();
    const sharedPostIds = Array.from(
      new Set(rows.map((m) => m.shared_post_id).filter(Boolean))
    );
    if (sharedPostIds.length > 0) {
      const { data: postRows } = await supabase
        .from("posts")
        .select("id, author_id, post_type, content, is_sensitive")
        .in("id", sharedPostIds);
      const authorIds = Array.from(
        new Set((postRows || []).map((p: any) => p.author_id))
      );
      const authorMap = new Map<string, { username: string; avatar_url: string | null }>();
      if (authorIds.length > 0) {
        const { data: authors } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", authorIds);
        for (const a of authors || [])
          authorMap.set(a.id, { username: a.username, avatar_url: a.avatar_url });
      }
      for (const p of postRows || []) {
        sharedPostMap.set(p.id, shapeSharedPost(p, authorMap.get(p.author_id)));
      }
    }

    // The other participant's read cursor drives "seen" receipts on OUR sent
    // messages (a real receipt, not a blanket true).
    const { data: otherReaders } = await supabase
      .from("conversation_participants")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .neq("profile_id", user.id)
      .limit(1);
    const otherReadAt = otherReaders?.[0]?.last_read_at
      ? new Date(otherReaders[0].last_read_at).getTime()
      : 0;

    const messages: Message[] = rows.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      mediaDuration: msg.media_duration ?? undefined,
      senderId: msg.sender_id,
      // Our sent messages: read iff the peer's cursor has passed them.
      // Received messages: we've read them by opening the conversation.
      isRead:
        msg.sender_id === user.id
          ? otherReadAt >= new Date(msg.created_at).getTime()
          : true,
      isEdited: msg.is_edited,
      isDeleted: msg.is_deleted,
      // Expose the raw ISO timestamp; the client formats it.
      createdAt: msg.created_at,
      reactions: reactionMap.get(msg.id) || [],
      replyTo: msg.reply_to_id ? replyMap.get(msg.reply_to_id) : undefined,
      sharedPost: msg.shared_post_id ? sharedPostMap.get(msg.shared_post_id) : undefined,
    }));

    return { success: true, messages };
  } catch (error) {
    console.error("Get messages error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  content: string,
  mediaUrl?: string,
  mediaType?: string,
  mediaDuration?: number,
  replyToId?: string,
  sharedPostId?: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Rate limit: 100 messages per minute per user
    const rateLimit = rateLimiters.message(`message:${user.id}`);
    if (!rateLimit.allowed) {
      return { success: false, error: "Slow down! You're sending messages too quickly." };
    }

    // Length cap — guard against storage abuse / oversized payloads.
    if ((content?.length ?? 0) > 8000) {
      return { success: false, error: "Message is too long (8000 characters max)." };
    }

    // Verify user is participant
    const { data: isParticipant } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id)
      .single();

    if (!isParticipant) {
      return { success: false, error: "Access denied" };
    }

    // Every OTHER member of the conversation — 1 for a DM, N for a group.
    // (No .single(): that throws the moment a group has ≥3 people.)
    const { data: otherRows } = await supabase
      .from("conversation_participants")
      .select("profile_id, is_muted")
      .eq("conversation_id", conversationId)
      .neq("profile_id", user.id);
    const otherParticipants = otherRows ?? [];
    const otherIds = otherParticipants.map((p) => p.profile_id);

    // Members in a block relationship with the sender (either direction).
    const blockedIds = new Set<string>();
    if (otherIds.length > 0) {
      const idList = otherIds.map((id) => sanitizeFilterTerm(id)).join(",");
      const me = sanitizeFilterTerm(user.id);
      const { data: blocks } = await supabase
        .from("blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${me},blocked_id.in.(${idList})),and(blocked_id.eq.${me},blocker_id.in.(${idList}))`
        );
      for (const b of blocks ?? []) {
        blockedIds.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
      }
    }

    // DM: a block hard-stops the send (preserves 1:1 behaviour). Group: one
    // blocked pair must NOT nuke the thread — the message still sends; blocked
    // members simply aren't notified (filtered in the notification step below).
    if (otherParticipants.length === 1 && blockedIds.size > 0) {
      return { success: false, error: "Unable to send message" };
    }

    // Create message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        media_duration: mediaDuration ?? null,
        reply_to_id: replyToId || null,
        shared_post_id: sharedPostId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Send message error:", error);
      return { success: false, error: "Failed to send message" };
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // A still-pending message request stays quiet: no notification until the
    // recipient accepts (they discover it via the Requests tab). Once accepted
    // (is_request=false), normal message notifications resume.
    const { data: convState } = await supabase
      .from("conversations")
      .select("is_request")
      .eq("id", conversationId)
      .maybeSingle();
    const isPendingRequest = Boolean(convState?.is_request);

    // Notify every other member who hasn't muted the conversation and isn't in a
    // block relationship with the sender (reuses the participant list fetched
    // above — no per-recipient round trips).
    const recipients = otherParticipants.filter(
      (p) => !p.is_muted && !blockedIds.has(p.profile_id)
    );
    if (!isPendingRequest && recipients.length > 0) {
      const notifications: TablesInsert<"notifications">[] = recipients.map((p) => ({
        recipient_id: p.profile_id,
        actor_id: user.id,
        notification_type: "message",
        message_id: message.id,
      }));
      await supabase.from("notifications").insert(notifications);
    }

    revalidatePath("/");
    return { success: true, messageId: message.id, conversationId };
  } catch (error) {
    console.error("Send message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Share a post into a DM with `recipientId`, reusing or creating the
 * conversation, optionally with a short note. Returns the conversation id so the
 * client can open it. Honours blocks + DM-privacy (via startConversation) and
 * routes to the recipient's requests inbox when they don't follow the sender.
 */
export async function sharePostToUser(
  recipientId: string,
  postId: string,
  note?: string
): Promise<MessageResult> {
  const convo = await startConversation(recipientId);
  if (!convo.success || !convo.conversationId) return convo;
  const sent = await sendMessage(
    convo.conversationId,
    note?.trim() || "",
    undefined,
    undefined,
    undefined,
    undefined,
    postId
  );
  if (!sent.success) return sent;
  return {
    success: true,
    conversationId: convo.conversationId,
    messageId: sent.messageId,
  };
}

/**
 * Share a post into an existing conversation (thin wrapper over sendMessage).
 */
export async function sharePostToConversation(
  conversationId: string,
  postId: string,
  note?: string
): Promise<MessageResult> {
  return sendMessage(
    conversationId,
    note?.trim() || "",
    undefined,
    undefined,
    undefined,
    undefined,
    postId
  );
}

/**
 * Start a new conversation
 * Optimized: Uses single query to find existing conversation instead of N+1
 */
export async function startConversation(
  participantId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    if (user.id === participantId) {
      return { success: false, error: "Cannot start conversation with yourself" };
    }

    // Check if either user has blocked the other
    const { data: block } = await supabase
      .from("blocks")
      .select("blocker_id")
      .or(
        `and(blocker_id.eq.${sanitizeFilterTerm(user.id)},blocked_id.eq.${sanitizeFilterTerm(participantId)}),and(blocker_id.eq.${sanitizeFilterTerm(participantId)},blocked_id.eq.${sanitizeFilterTerm(user.id)})`
      )
      .limit(1)
      .maybeSingle();

    if (block) {
      return { success: false, error: "Unable to send message" };
    }

    // Check if conversation already exists using a single optimized query
    // (existing conversations are always allowed; DM-privacy only gates NEW ones).
    // Find conversations where both users are participants
    const { data: myConversations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("profile_id", user.id);

    if (myConversations && myConversations.length > 0) {
      const myConversationIds = myConversations.map((c: any) => c.conversation_id);

      // Conversations shared with the target user.
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("profile_id", participantId)
        .in("conversation_id", myConversationIds);
      const sharedIds = (shared ?? []).map((s) => s.conversation_id);

      if (sharedIds.length > 0) {
        // Only reuse an existing 1:1 DM — never a shared GROUP (a group both of
        // you happen to be in is not "the DM"). Also avoids .single() throwing
        // when a DM and a shared group both match.
        const { data: existingDm } = await supabase
          .from("conversations")
          .select("id")
          .in("id", sharedIds)
          .eq("is_group", false)
          .limit(1)
          .maybeSingle();
        if (existingDm) {
          return { success: true, conversationId: existingDm.id };
        }
      }
    }

    // DM privacy: does the recipient accept a NEW conversation from this sender?
    // Missing column (pre-migration) → treated as "everyone" (permissive).
    const { data: recipient } = await supabase
      .from("profiles")
      .select("dm_privacy")
      .eq("id", participantId)
      .maybeSingle();
    const dmPrivacy = recipient?.dm_privacy ?? "everyone";
    if (dmPrivacy === "none") {
      return { success: false, error: "This person isn't accepting new messages." };
    }
    if (dmPrivacy === "following") {
      // They only accept DMs from people they follow → they must follow the sender.
      const { data: followsSender } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", participantId)
        .eq("following_id", user.id)
        .limit(1)
        .maybeSingle();
      if (!followsSender) {
        return {
          success: false,
          error: "This person only accepts messages from people they follow.",
        };
      }
    }

    // Message request routing: under the permissive "everyone" setting, a DM from
    // someone the recipient does NOT follow lands as a pending request rather than
    // straight in their inbox. ("following"/"none" are already hard-gated above, so
    // any conversation that reaches here under those settings is a real one.)
    let isRequest = false;
    if (dmPrivacy === "everyone") {
      const { data: recipFollowsSender } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", participantId)
        .eq("following_id", user.id)
        .limit(1)
        .maybeSingle();
      isRequest = !recipFollowsSender;
    }

    // Create new conversation and add both participants using admin client
    // (RLS only allows inserting conversation_participants for your own profile_id)
    const admin = createAdminClient();

    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .insert({
        is_request: isRequest,
        requested_by: isRequest ? user.id : null,
      })
      .select("id")
      .single();

    if (convError) {
      return { success: false, error: "Failed to create conversation" };
    }

    const { error: partError } = await admin
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, profile_id: user.id },
        { conversation_id: conversation.id, profile_id: participantId },
      ]);

    if (partError) {
      return { success: false, error: "Failed to add participants" };
    }

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    console.error("Start conversation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Create a group conversation. The creator becomes the owner; the invitees are
 * added as members. Blocks are respected (blocked people aren't added); DM
 * privacy is NOT applied to group invites (the creator chooses the members).
 */
export async function createGroup(
  name: string,
  participantIds: string[]
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const trimmedName = name.trim();
    if (!trimmedName) return { success: false, error: "Group name is required" };
    if (trimmedName.length > 80) {
      return { success: false, error: "Group name is too long (80 characters max)." };
    }

    // Dedupe, drop self + blanks.
    const uniqueIds = [...new Set(participantIds.filter((id) => id && id !== user.id))];
    if (uniqueIds.length < 2) {
      return { success: false, error: "A group needs at least two other people." };
    }
    if (uniqueIds.length > 49) {
      return { success: false, error: "Groups are limited to 50 members." };
    }

    // Don't add anyone in a block relationship with the creator.
    const idList = uniqueIds.map((id) => sanitizeFilterTerm(id)).join(",");
    const me = sanitizeFilterTerm(user.id);
    const { data: blocks } = await supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(
        `and(blocker_id.eq.${me},blocked_id.in.(${idList})),and(blocked_id.eq.${me},blocker_id.in.(${idList}))`
      );
    const blocked = new Set<string>();
    for (const b of blocks ?? []) {
      blocked.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id);
    }

    // Keep only real, non-blocked profiles (avoids FK errors on junk ids).
    const candidateIds = uniqueIds.filter((id) => !blocked.has(id));
    const { data: validProfiles } = await supabase
      .from("profiles")
      .select("id")
      .in("id", candidateIds.length > 0 ? candidateIds : ["00000000-0000-0000-0000-000000000000"]);
    const memberIds = (validProfiles ?? []).map((p) => p.id);
    if (memberIds.length < 2) {
      return {
        success: false,
        error: "A group needs at least two other people you haven't blocked.",
      };
    }

    // Create the group + membership via the admin client (RLS only lets a user
    // insert their own participant row).
    const admin = createAdminClient();
    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .insert({ is_group: true, name: trimmedName, owner_id: user.id })
      .select("id")
      .single();
    if (convError || !conversation) {
      console.error("Create group error:", convError);
      return { success: false, error: "Failed to create group" };
    }

    const rows = [user.id, ...memberIds].map((profile_id) => ({
      conversation_id: conversation.id,
      profile_id,
    }));
    const { error: partError } = await admin
      .from("conversation_participants")
      .insert(rows);
    if (partError) {
      console.error("Create group participants error:", partError);
      return { success: false, error: "Failed to add members" };
    }

    return { success: true, conversationId: conversation.id };
  } catch (error) {
    console.error("Create group error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Edit a message
 */
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("messages")
      .update({
        content: newContent,
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      return { success: false, error: "Failed to edit message" };
    }

    return { success: true, messageId };
  } catch (error) {
    console.error("Edit message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(messageId: string): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("messages")
      .update({
        is_deleted: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      return { success: false, error: "Failed to delete message" };
    }

    return { success: true, messageId };
  } catch (error) {
    console.error("Delete message error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Hide a conversation from the user's list (soft delete — only hides for this user)
 */
export async function hideConversation(
  conversationId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    // Remove the user's participation record — this hides the conversation
    // from their list without affecting the other participant.
    // Uses admin client to bypass RLS (DELETE policy may not exist yet).
    const admin = createAdminClient();
    const { error } = await admin
      .from("conversation_participants")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    if (error) {
      console.error("Hide conversation error:", error);
      return { success: false, error: "Failed to delete conversation" };
    }

    revalidatePath("/messages");
    return { success: true, conversationId };
  } catch (error) {
    console.error("Hide conversation error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

/**
 * Mute / unmute a conversation for the current user (suppresses its
 * new-message notifications + unread badge — per participant, not global).
 */
export async function setConversationMuted(
  conversationId: string,
  muted: boolean
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const { error } = await supabase
      .from("conversation_participants")
      .update({ is_muted: muted })
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    if (error) return { success: false, error: "Failed to update mute state" };
    return { success: true, conversationId };
  } catch {
    return { success: false, error: "An unexpected error occurred" };
  }
}

export interface MessageSearchResult {
  conversationId: string;
  messageId: string;
  content: string;
  createdAt: string;
  senderId: string;
}

/**
 * Search the current user's message history by content. RLS + the explicit
 * conversation scope keep results to conversations the user is in.
 */
export async function searchMessages(
  rawQuery: string
): Promise<{ success: boolean; results?: MessageSearchResult[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const term = sanitizeFilterTerm(rawQuery).trim();
    if (term.length < 2) return { success: true, results: [] };

    const { data: myConvos } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("profile_id", user.id);
    const convoIds = (myConvos || []).map((c: any) => c.conversation_id);
    if (convoIds.length === 0) return { success: true, results: [] };

    const { data: msgs } = await supabase
      .from("messages")
      .select("id, conversation_id, content, created_at, sender_id")
      .in("conversation_id", convoIds)
      .eq("is_deleted", false)
      .ilike("content", `%${term}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    const results: MessageSearchResult[] = (msgs || []).map((m: any) => ({
      conversationId: m.conversation_id,
      messageId: m.id,
      content: m.content || "",
      createdAt: m.created_at,
      senderId: m.sender_id,
    }));

    return { success: true, results };
  } catch (error) {
    console.error("Search messages error:", error);
    return { success: false, error: "Failed to search messages" };
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(
  conversationId: string
): Promise<MessageResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("conversation_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("profile_id", user.id);

    if (error) {
      return { success: false, error: "Failed to mark as read" };
    }

    return { success: true, conversationId };
  } catch (error) {
    console.error("Mark as read error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

