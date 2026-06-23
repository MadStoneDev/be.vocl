"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconMessage,
  IconHeart,
  IconHeartFilled,
  IconMicrophone,
  IconRefresh,
  IconLoader2,
  IconSend,
  IconShare,
} from "@tabler/icons-react";
import { Avatar, toast } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useLike } from "@/hooks/useLike";
import { reblogPost, getRebloggedBy } from "@/actions/reblogs";
import { getLikesByPost } from "@/actions/likes";
import { getCommentsByPost, createComment } from "@/actions/comments";
import { VoiceReactionsPanel } from "@/components/Post/VoiceReactionsPanel";

type Panel = "comments" | "likes" | "voice" | "reblogs" | null;

interface MiniUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

function UserRow({ user }: { user: MiniUser }) {
  return (
    <Link
      href={`/profile/${user.username}`}
      className="flex items-center gap-2.5 py-1.5 hover:opacity-90 transition-opacity"
    >
      <Avatar src={user.avatarUrl || ""} username={user.username} size="sm" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-tight">
          {user.displayName || user.username}
        </p>
        <p className="type-meta text-foreground/45 truncate">@{user.username}</p>
      </div>
    </Link>
  );
}

function PanelLoading() {
  return (
    <div className="flex justify-center py-4">
      <IconLoader2 size={18} className="animate-spin text-foreground/40" />
    </div>
  );
}

function LikesPanel({ postId, isLiked, onLike }: { postId: string; isLiked: boolean; onLike: () => void }) {
  const [users, setUsers] = useState<MiniUser[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getLikesByPost(postId).then((r) => {
      if (r.success && r.likes) setUsers(r.likes as MiniUser[]);
      setLoading(false);
    });
  }, [postId]);
  return (
    <div>
      <button
        type="button"
        onClick={onLike}
        className={`mb-2 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 type-meta uppercase tracking-widest font-semibold transition-colors ${
          isLiked ? "border-vocl-like text-vocl-like" : "border-vocl-border text-foreground/60 hover:border-vocl-like hover:text-vocl-like"
        }`}
      >
        {isLiked ? <IconHeartFilled size={14} /> : <IconHeart size={14} />}
        {isLiked ? "Liked" : "Like"}
      </button>
      {loading ? (
        <PanelLoading />
      ) : users.length ? (
        <div className="max-h-56 overflow-y-auto">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <p className="type-meta text-foreground/45 py-2">No likes yet.</p>
      )}
    </div>
  );
}

function RebloggersPanel({ postId, reblogged, onReblog }: { postId: string; reblogged: boolean; onReblog: () => void }) {
  const [users, setUsers] = useState<MiniUser[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    getRebloggedBy(postId).then((r) => {
      if (r.success && r.users) setUsers(r.users as MiniUser[]);
      setLoading(false);
    });
  }, [postId]);
  return (
    <div>
      <button
        type="button"
        onClick={onReblog}
        className={`mb-2 inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 type-meta uppercase tracking-widest font-semibold transition-colors ${
          reblogged ? "border-vocl-primary text-vocl-primary" : "border-vocl-border text-foreground/60 hover:border-vocl-primary hover:text-vocl-primary"
        }`}
      >
        <IconRefresh size={14} />
        {reblogged ? "Reblogged" : "Reblog"}
      </button>
      {loading ? (
        <PanelLoading />
      ) : users.length ? (
        <div className="max-h-56 overflow-y-auto">
          {users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </div>
      ) : (
        <p className="type-meta text-foreground/45 py-2">No reblogs yet.</p>
      )}
    </div>
  );
}

function CommentsPanel({ postId, canPost, onJoin }: { postId: string; canPost: boolean; onJoin: () => void }) {
  const [comments, setComments] = useState<Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null; content: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [posting, startPost] = useTransition();

  const load = () =>
    getCommentsByPost(postId).then((r) => {
      if (r.success && r.comments) setComments(r.comments as typeof comments);
      setLoading(false);
    });
  useEffect(() => {
    void load();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () => {
    if (!canPost) return onJoin();
    const content = draft.trim();
    if (!content) return;
    startPost(async () => {
      const res = await createComment(postId, content);
      if (res.success) {
        setDraft("");
        await load();
      } else {
        toast.error(res.error || "Failed to comment");
      }
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          onFocus={() => !canPost && onJoin()}
          placeholder={canPost ? "Add a comment…" : "Join to comment"}
          className="flex-1 py-2 px-3 rounded-sm bg-vocl-hover border border-vocl-border text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-primary"
        />
        <button
          type="button"
          onClick={submit}
          disabled={posting}
          className="flex-shrink-0 p-2 rounded-sm bg-vocl-primary text-white hover:bg-vocl-primary-hover transition-colors disabled:opacity-50"
          aria-label="Send comment"
        >
          {posting ? <IconLoader2 size={16} className="animate-spin" /> : <IconSend size={16} />}
        </button>
      </div>
      {loading ? (
        <PanelLoading />
      ) : comments.length ? (
        <div className="max-h-56 overflow-y-auto space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Link href={`/profile/${c.username}`} className="shrink-0">
                <Avatar src={c.avatarUrl || ""} username={c.username} size="sm" />
              </Link>
              <div className="min-w-0">
                <Link href={`/profile/${c.username}`} className="text-sm font-medium text-foreground hover:text-vocl-primary transition-colors">
                  {c.displayName || c.username}
                </Link>
                <p className="text-sm text-foreground/75 whitespace-pre-wrap leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="type-meta text-foreground/45 py-2">No comments yet. Start the conversation.</p>
      )}
    </div>
  );
}

/**
 * Newspaper-tile engagement: a compact action row whose counts EXPAND inline to a
 * quick-view (who liked / reblogged / voice-reacted, and the comment thread) and
 * let you act — like, reblog, comment, voice-react — without leaving the feed.
 * Logged-out visitors are routed to /signup on any write.
 */
export function TileEngagement({
  postId,
  comments = 0,
  likes = 0,
  voice = 0,
  reblogs = 0,
  hasLiked = false,
  hasReblogged = false,
  share = false,
}: {
  postId: string;
  comments?: number;
  likes?: number;
  voice?: number;
  reblogs?: number;
  hasLiked?: boolean;
  hasReblogged?: boolean;
  /** Show a Share button (copies the current URL) — used on the post page. */
  share?: boolean;
}) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [panel, setPanel] = useState<Panel>(null);
  const { isLiked, likeCount, handleLike } = useLike({
    postId,
    initialLiked: hasLiked,
    initialCount: likes,
  });
  const [reblogged, setReblogged] = useState(hasReblogged);
  const [reblogCount, setReblogCount] = useState(reblogs);
  const [, startReblog] = useTransition();

  const goJoin = () => router.push("/signup");
  const guardedLike = () => (isAuthenticated ? handleLike() : goJoin());
  const onReblog = () => {
    if (!isAuthenticated) return goJoin();
    if (reblogged) return;
    setReblogged(true);
    setReblogCount((c) => c + 1);
    startReblog(async () => {
      const res = await reblogPost(postId, "instant");
      if (!res.success) {
        setReblogged(false);
        setReblogCount((c) => c - 1);
        toast.error(res.error || "Failed to reblog");
      } else {
        toast.success("Reblogged");
      }
    });
  };

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? null : p));
  const btn = (active: boolean, activeColor: string) =>
    `inline-flex items-center gap-1.5 type-meta transition-colors ${active ? activeColor : `text-foreground/45 hover:${activeColor.replace("text-", "text-")}`}`;

  return (
    <div className="mt-3 pt-3 border-t border-vocl-border">
      <div className="flex items-center gap-5">
        <button type="button" onClick={() => toggle("comments")} aria-label="Comments" className={btn(panel === "comments", "text-vocl-primary")}>
          <IconMessage size={16} />
          <span className="tabular-nums">{comments}</span>
        </button>
        <button type="button" onClick={() => toggle("likes")} aria-label="Likes" className={btn(panel === "likes" || isLiked, "text-vocl-like")}>
          {isLiked ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button type="button" onClick={() => toggle("voice")} aria-label="Voice reactions" className={btn(panel === "voice", "text-vocl-primary")}>
          <IconMicrophone size={16} />
          <span className="tabular-nums">{voice}</span>
        </button>
        <button type="button" onClick={() => toggle("reblogs")} aria-label="Reblogs" className={btn(panel === "reblogs" || reblogged, "text-vocl-primary")}>
          <IconRefresh size={16} />
          <span className="tabular-nums">{reblogCount}</span>
        </button>
        {share && (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied");
            }}
            aria-label="Share"
            className="ml-auto inline-flex items-center gap-1.5 type-meta uppercase tracking-widest text-foreground/45 hover:text-vocl-primary transition-colors"
          >
            <IconShare size={15} />
            Share
          </button>
        )}
      </div>

      {panel && (
        <div className="mt-3 border-t border-vocl-border pt-3">
          {panel === "likes" && <LikesPanel postId={postId} isLiked={isLiked} onLike={guardedLike} />}
          {panel === "reblogs" && <RebloggersPanel postId={postId} reblogged={reblogged} onReblog={onReblog} />}
          {panel === "comments" && <CommentsPanel postId={postId} canPost={isAuthenticated} onJoin={goJoin} />}
          {panel === "voice" && <VoiceReactionsPanel postId={postId} isLoggedIn={isAuthenticated} onRequireAuth={goJoin} flush />}
        </div>
      )}
    </div>
  );
}
