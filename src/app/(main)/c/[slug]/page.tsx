"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { IconLoader2 } from "@tabler/icons-react";
import {
  getCommunityFeed,
  joinCommunity,
  leaveCommunity,
  setCommunityPostPinned,
  removeFromCommunity,
  type CommunitySummary,
} from "@/actions/communities";
import { toast, PullToRefresh, TimeAgo } from "@/components/ui";

interface CommunityPost {
  id: string;
  authorId: string;
  author: { username: string; displayName: string | null; avatarUrl: string | null; role: number };
  postType: string;
  content: any;
  isSensitive: boolean;
  isPinned: boolean;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasBookmarked?: boolean;
  tags: Array<{ id: string; name: string }>;
}

// --- tile helpers (a desk is a section front — posts render as tiles) ---
const TYPE_KICKER: Record<string, string> = {
  text: "Note", image: "Photo", gallery: "Photo", video: "Video", audio: "Listen", poll: "Poll", ask: "Ask",
};
function stripHtml(html?: string): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function clamp(s: string, n: number): string {
  if (!s) return "";
  return s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, "") + "…";
}
function tileKicker(p: CommunityPost): string {
  if (p.content?.is_essay) return "Essay";
  return TYPE_KICKER[p.postType] || "Note";
}
function tileHeadline(p: CommunityPost): string {
  const c = p.content || {};
  if (c.essay_title) return c.essay_title;
  if (p.postType === "poll") return clamp(c.question || "A poll", 90);
  if (p.postType === "audio") return c.spotify_data?.name || (c.is_voice_note ? "Voice note" : "Audio");
  if (p.postType === "text") return clamp(c.plain || stripHtml(c.html), 90) || "Note";
  const cap = stripHtml(c.caption_html);
  return cap ? clamp(cap, 80) : `@${p.author.username}`;
}
function tileExcerpt(p: CommunityPost): string {
  if (p.postType === "text") return clamp(stripHtml(p.content?.html) || p.content?.plain || "", 140);
  return "";
}
function tileThumb(p: CommunityPost): string | null {
  const c = p.content || {};
  return c.urls?.[0] || c.thumbnail_url || c.album_art_url || null;
}

export default function CommunityPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [community, setCommunity] = useState<CommunitySummary | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [pendingRequest, setPendingRequest] = useState(false);
  const [busyPostAction, setBusyPostAction] = useState<Record<string, boolean>>({});

  const load = useCallback(async (offset = 0, append = false) => {
    if (offset === 0) setLoading(true);
    else setLoadingMore(true);
    const result = await getCommunityFeed(slug, { limit: 20, offset });
    if (!result.success || !result.community) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    setCommunity(result.community);
    setPosts((prev) => (append ? [...prev, ...((result.posts as CommunityPost[]) || [])] : (result.posts as CommunityPost[]) || []));
    setHasMore(!!result.hasMore);
    setLoading(false);
    setLoadingMore(false);
  }, [slug]);

  useEffect(() => { load(0, false); }, [load]);

  const handleJoinToggle = async () => {
    if (!community || busyJoin) return;
    setBusyJoin(true);
    if (community.isMember) {
      const result = await leaveCommunity(community.id);
      if (result.success) {
        setCommunity({ ...community, isMember: false, memberCount: Math.max(0, community.memberCount - 1) });
      } else toast.error(result.error || "Action failed");
    } else {
      const result = await joinCommunity(community.id);
      if (result.success) {
        if (result.pending) {
          setPendingRequest(true);
          toast.success("Request sent — awaiting approval");
        } else {
          setCommunity({ ...community, isMember: true, memberCount: community.memberCount + 1 });
        }
      } else toast.error(result.error || "Action failed");
    }
    setBusyJoin(false);
  };

  const handleTogglePin = async (postId: string, currentlyPinned: boolean) => {
    if (!community) return;
    setBusyPostAction((b) => ({ ...b, [`pin-${postId}`]: true }));
    const result = await setCommunityPostPinned(community.id, postId, !currentlyPinned);
    if (result.success) {
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, isPinned: !currentlyPinned } : p)));
      toast.success(currentlyPinned ? "Unpinned" : "Pinned");
    } else toast.error(result.error || "Failed");
    setBusyPostAction((b) => ({ ...b, [`pin-${postId}`]: false }));
  };

  const handleRemovePost = async (postId: string) => {
    if (!community) return;
    if (!confirm("Remove this post from the desk?")) return;
    setBusyPostAction((b) => ({ ...b, [`remove-${postId}`]: true }));
    const result = await removeFromCommunity(community.id, postId);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Removed");
    } else toast.error(result.error || "Failed");
    setBusyPostAction((b) => ({ ...b, [`remove-${postId}`]: false }));
  };

  if (notFound) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="slug text-meta-dim mb-4">No such desk</p>
        <h1 className="type-display text-ink mb-3">This desk doesn&apos;t exist.</h1>
        <p className="editorial-body text-meta mb-6">It may have been closed, or it isn&apos;t visible to you.</p>
        <Link href="/communities" className="slug text-accent hover:text-ink transition-colors">Browse the desks →</Link>
      </div>
    );
  }
  if (loading || !community) {
    return <div className="flex justify-center py-16"><IconLoader2 size={32} className="animate-spin text-accent" /></div>;
  }

  const isMod = community.myRole === "moderator" || community.myRole === "owner";
  const joinLabel = community.joinPolicy === "open" ? "Open to members" : community.joinPolicy === "request" ? "By request" : "Invite only";
  const est = new Date(community.createdAt).toLocaleDateString("en-AU", { month: "short", year: "numeric" }).toUpperCase();
  const dateStr = new Date().toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const lead = posts[0];
  const rest = posts.slice(1);

  const modActions = (post: CommunityPost) =>
    isMod ? (
      <span className="ml-auto flex gap-3">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleTogglePin(post.id, post.isPinned); }}
          disabled={busyPostAction[`pin-${post.id}`]}
          className="slug text-meta-dim hover:text-ink transition-colors"
        >
          {post.isPinned ? "Unpin" : "Pin"}
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); handleRemovePost(post.id); }}
          disabled={busyPostAction[`remove-${post.id}`]}
          className="slug text-meta-dim hover:text-vocl-like transition-colors"
        >
          Remove
        </button>
      </span>
    ) : null;

  const smallTile = (post: CommunityPost, i: number) => (
    <Link
      key={post.id}
      href={`/post/${post.id}`}
      className={`group block border-b border-rule py-5 ${i % 2 === 1 ? "sm:border-l sm:border-rule sm:pl-6" : "sm:pr-6"}`}
    >
      <div className="kicker mb-2">{post.isPinned ? <span className="kicker-accent">Pinned · </span> : null}{tileKicker(post)}</div>
      <h3 className="type-heading text-ink transition-colors group-hover:text-accent">{tileHeadline(post)}</h3>
      {tileExcerpt(post) && <p className="editorial-body mt-1.5 line-clamp-2 text-[0.95rem] text-editorial-body">{tileExcerpt(post)}</p>}
      <div className="byline mt-2 flex items-center gap-2 text-meta">
        <span>{post.author.username}</span>
        <span aria-hidden="true">·</span>
        <TimeAgo iso={post.createdAt} />
        {post.commentCount > 0 && <><span aria-hidden="true">·</span><span>{post.commentCount} comments</span></>}
        {modActions(post)}
      </div>
    </Link>
  );

  return (
    <PullToRefresh onRefresh={() => load(0, false)}>
      <title>{`${community.name} | be.vocl`}</title>
      <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        {/* Utility row */}
        <div className="flex items-center justify-between gap-4 py-4">
          <span className="byline truncate text-meta">{dateStr} · Late edition</span>
          <span className="flex items-center gap-4">
            <button type="button" className="byline text-meta hover:text-ink transition-colors">Search</button>
            <Link href="/create" className="border border-foreground px-4 py-2 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-ink hover:bg-vocl-hover transition-colors">Write</Link>
          </span>
        </div>

        {/* Desk masthead */}
        <div className="border-y border-rule py-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
            <div className="min-w-0">
              <div className="kicker kicker-accent mb-3">Desk · {joinLabel} · 21+</div>
              <h1 className="font-display text-4xl leading-none tracking-[-0.01em] text-ink sm:text-[3.5rem]">{community.name}</h1>
              {community.description && (
                <p className="editorial-deck mt-3 max-w-[60ch] text-body">{community.description}</p>
              )}
            </div>
            <div className="flex-none sm:text-right">
              <div className="slug mb-3.5 text-meta-dim">
                EST. {est} · {community.memberCount.toLocaleString()} MEMBERS · {community.postCount.toLocaleString()} POSTS
              </div>
              {community.isMember ? (
                <button
                  type="button"
                  onClick={handleJoinToggle}
                  disabled={busyJoin}
                  className="slug text-meta hover:text-vocl-like transition-colors disabled:opacity-50"
                >
                  {busyJoin ? "Leaving…" : "Leave the desk"}
                </button>
              ) : pendingRequest ? (
                <span className="slug text-meta-dim">Request pending</span>
              ) : (
                <button
                  type="button"
                  onClick={handleJoinToggle}
                  disabled={busyJoin}
                  className="bg-accent px-6 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50"
                >
                  {busyJoin ? "…" : community.joinPolicy === "open" ? "Join the desk" : "Request to join"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section bar */}
        <div className="flex items-center justify-between gap-4 rule-double-b py-3">
          <div className="flex gap-6 overflow-x-auto sm:gap-7">
            <span className="section-tab" data-active="true">Tonight</span>
            <Link href={`/c/${community.slug}/about`} className="section-tab hover:text-ink">About</Link>
            {isMod && (
              <Link href={`/c/${community.slug}/settings`} className="section-tab hover:text-ink">Settings</Link>
            )}
          </div>
          <span className="slug hidden text-meta-dim sm:block">/c/{community.slug}</span>
        </div>

        {/* Section-front grid */}
        <div className="grid grid-cols-1 pt-8 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
          {/* Left — the desk feed */}
          <div className="lg:pr-9">
            {posts.length === 0 ? (
              <div className="py-16 text-center">
                <p className="slug text-meta-dim mb-3">Quiet on the desk</p>
                <p className="editorial-body text-meta">
                  {community.isMember ? "Nothing filed here yet — be the first." : "No posts on this desk yet."}
                </p>
              </div>
            ) : (
              <>
                {/* Lead */}
                {lead && (
                  <Link href={`/post/${lead.id}`} className="group block">
                    <div className="kicker kicker-accent mb-3">
                      {lead.isPinned ? "Pinned · " : "Lead tonight · "}{tileKicker(lead)}
                    </div>
                    <h2 className="font-display text-3xl leading-[1.04] text-ink transition-colors group-hover:text-accent sm:text-[2.75rem]">
                      {tileHeadline(lead)}
                    </h2>
                    {tileExcerpt(lead) && <p className="editorial-deck mt-3.5 max-w-[62ch] text-body">{tileExcerpt(lead)}</p>}
                    <div className="byline mt-4 flex items-center gap-2 border-b border-rule pb-4 text-meta">
                      <span className="text-ink">By {lead.author.username}</span>
                      <span aria-hidden="true">·</span>
                      <TimeAgo iso={lead.createdAt} />
                      {lead.commentCount > 0 && <><span aria-hidden="true">·</span><span>{lead.commentCount} comments</span></>}
                      {modActions(lead)}
                    </div>
                    {tileThumb(lead) && (
                      <div className="relative mt-5 aspect-[3/2] w-full overflow-hidden bg-panel">
                        <Image src={tileThumb(lead)!} alt="" fill sizes="(max-width:1024px) 100vw, 60vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      </div>
                    )}
                  </Link>
                )}

                {rest.length > 0 && (
                  <>
                    <div className="slug mt-8 border-b border-rule pb-3 text-meta">Also on the desk</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2">{rest.map(smallTile)}</div>
                  </>
                )}

                {hasMore && (
                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => load(posts.length, true)}
                      disabled={loadingMore}
                      className="slug text-meta hover:text-accent transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? "Loading…" : "More from the desk →"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right rail */}
          <aside className="mt-10 lg:mt-0 lg:border-l lg:border-rule lg:pl-8">
            <div className="kicker kicker-accent border-b border-rule pb-3">About this desk</div>
            {community.description && (
              <p className="editorial-body mt-3.5 text-ink-secondary">{community.description}</p>
            )}

            <div className="slug mt-6 border-b border-rule pb-3 text-meta">Desk facts</div>
            <div className="flex items-center justify-between border-b border-rule py-3 text-[13px]">
              <span className="text-meta">Founded</span><span className="text-ink">{est}</span>
            </div>
            <div className="flex items-center justify-between border-b border-rule py-3 text-[13px]">
              <span className="text-meta">Members</span><span className="text-ink tabular-nums">{community.memberCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-rule py-3 text-[13px]">
              <span className="text-meta">Posts</span><span className="text-ink tabular-nums">{community.postCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-rule py-3 text-[13px]">
              <span className="text-meta">Entry</span><span className="text-ink">{joinLabel}</span>
            </div>
            {community.nsfw && (
              <div className="mt-6">
                <span className="stamp-21">21+ · Adults only</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </PullToRefresh>
  );
}
