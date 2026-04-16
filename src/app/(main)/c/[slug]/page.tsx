"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  IconUsersGroup,
  IconLoader2,
  IconCheck,
  IconUser,
  IconNotes,
  IconAlertTriangle,
  IconPin,
  IconPinFilled,
  IconSettings,
  IconInfoCircle,
  IconClock,
  IconTrash,
} from "@tabler/icons-react";
import {
  getCommunityFeed,
  joinCommunity,
  leaveCommunity,
  setCommunityPostPinned,
  removeFromCommunity,
  type CommunitySummary,
} from "@/actions/communities";
import {
  InteractivePost,
  ImageContent,
  TextContent,
  VideoContent,
  AudioContent,
  GalleryContent,
  LinkPreviewCarousel,
} from "@/components/Post";
import { toast, PullToRefresh } from "@/components/ui";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import type { VideoEmbedPlatform } from "@/types/database";

interface CommunityPost {
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
  createdAt: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  hasLiked: boolean;
  hasBookmarked?: boolean;
  tags: Array<{ id: string; name: string }>;
}

function renderPostContent(post: CommunityPost) {
  const c = post.content || {};
  switch (post.postType) {
    case "text":
      return (
        <>
          <TextContent
            html={c.html}
            isEssay={c.is_essay}
            essayTitle={c.essay_title}
            readingTimeMinutes={c.reading_time_minutes}
          >{c.plain || c.text}</TextContent>
          {c.link_previews?.length > 0 && (
            <div className="bg-[#EBEBEB] -mt-16 pb-16">
              <LinkPreviewCarousel previews={c.link_previews} />
            </div>
          )}
        </>
      );
    case "image":
      return <ImageContent src={c.urls?.[0] || c.url} alt="Post image" caption={c.caption_html} />;
    case "gallery":
      return <GalleryContent images={c.urls || []} caption={c.caption_html} />;
    case "video":
      return (
        <VideoContent
          src={c.url}
          thumbnailUrl={c.thumbnail_url}
          embedUrl={c.embed_url}
          embedPlatform={c.embed_platform as VideoEmbedPlatform}
          caption={c.caption_html}
        />
      );
    case "audio":
      return (
        <AudioContent
          src={c.url}
          albumArtUrl={c.album_art_url}
          spotifyData={c.spotify_data}
          caption={c.caption_html}
          transcript={c.transcript}
          isVoiceNote={c.is_voice_note}
        />
      );
    default:
      return null;
  }
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

  useEffect(() => {
    load(0, false);
  }, [load]);

  const handleJoinToggle = async () => {
    if (!community || busyJoin) return;
    setBusyJoin(true);
    if (community.isMember) {
      const result = await leaveCommunity(community.id);
      if (result.success) {
        setCommunity({
          ...community,
          isMember: false,
          memberCount: Math.max(0, community.memberCount - 1),
        });
      } else {
        toast.error(result.error || "Action failed");
      }
    } else {
      const result = await joinCommunity(community.id);
      if (result.success) {
        if (result.pending) {
          setPendingRequest(true);
          toast.success("Request sent — awaiting approval");
        } else {
          setCommunity({
            ...community,
            isMember: true,
            memberCount: community.memberCount + 1,
          });
        }
      } else {
        toast.error(result.error || "Action failed");
      }
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
    } else {
      toast.error(result.error || "Failed");
    }
    setBusyPostAction((b) => ({ ...b, [`pin-${postId}`]: false }));
  };

  const handleRemovePost = async (postId: string) => {
    if (!community) return;
    if (!confirm("Remove this post from the community?")) return;
    setBusyPostAction((b) => ({ ...b, [`remove-${postId}`]: true }));
    const result = await removeFromCommunity(community.id, postId);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Removed");
    } else {
      toast.error(result.error || "Failed");
    }
    setBusyPostAction((b) => ({ ...b, [`remove-${postId}`]: false }));
  };

  if (notFound) {
    return (
      <div className="py-12 px-4 max-w-xl mx-auto text-center">
        <IconUsersGroup size={48} className="mx-auto text-foreground/20 mb-3" />
        <h1 className="text-xl font-semibold text-foreground mb-1">Community not found</h1>
        <p className="text-sm text-foreground/50">
          This community doesn't exist or isn't visible to you.
        </p>
        <Link href="/communities" className="inline-block mt-4 text-sm text-vocl-accent hover:underline">
          Browse communities
        </Link>
      </div>
    );
  }

  if (loading || !community) {
    return (
      <div className="py-12 flex justify-center">
        <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={() => load(0, false)}>
      {community && <title>{`${community.name} | be.vocl`}</title>}
    <div className="pb-6">
      {/* Banner */}
      <div className="relative h-32 sm:h-44 bg-gradient-to-br from-vocl-accent/30 to-vocl-accent-hover/20">
        {community.bannerUrl && (
          <Image src={community.bannerUrl} alt="" fill className="object-cover" priority />
        )}
      </div>

      {/* Header */}
      <div className="px-4 sm:px-6 -mt-10">
        <div className="flex items-end gap-4">
          <div className="w-20 h-20 rounded-2xl bg-vocl-surface-dark border-4 border-background overflow-hidden flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {community.iconUrl ? (
              <Image src={community.iconUrl} alt="" width={80} height={80} className="object-cover" />
            ) : (
              <span className="bg-gradient-to-br from-vocl-accent to-vocl-accent-hover w-full h-full flex items-center justify-center">
                {community.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {community.name}
              </h1>
              {community.nsfw && (
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                  NSFW
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/50">/c/{community.slug}</p>
          </div>
          <button
            onClick={handleJoinToggle}
            disabled={busyJoin || pendingRequest}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex-shrink-0 ${
              community.isMember
                ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                : pendingRequest
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
            }`}
          >
            {busyJoin ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : community.isMember ? (
              <span className="inline-flex items-center gap-1">
                <IconCheck size={14} /> Joined
              </span>
            ) : pendingRequest ? (
              <span className="inline-flex items-center gap-1">
                <IconClock size={14} /> Pending
              </span>
            ) : community.joinPolicy === "open" ? (
              "Join"
            ) : (
              "Request to join"
            )}
          </button>
        </div>

        {/* Sub-nav */}
        <div className="flex gap-1 mt-4">
          <Link
            href={`/c/${community.slug}/about`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 text-foreground/70 hover:bg-white/10 text-xs font-medium"
          >
            <IconInfoCircle size={14} /> About
          </Link>
          {(community.myRole === "moderator" || community.myRole === "owner") && (
            <Link
              href={`/c/${community.slug}/settings`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-vocl-accent/15 text-vocl-accent hover:bg-vocl-accent/25 text-xs font-medium"
            >
              <IconSettings size={14} /> Settings
            </Link>
          )}
        </div>

        {community.description && (
          <p className="mt-3 text-sm text-foreground/80">{community.description}</p>
        )}

        <div className="flex items-center gap-4 mt-3 text-xs text-foreground/50">
          <span className="flex items-center gap-1">
            <IconUser size={12} />
            {community.memberCount.toLocaleString()} {community.memberCount === 1 ? "member" : "members"}
          </span>
          <span className="flex items-center gap-1">
            <IconNotes size={12} />
            {community.postCount.toLocaleString()} {community.postCount === 1 ? "post" : "posts"}
          </span>
        </div>
      </div>

      {/* NSFW gate hint */}
      {community.nsfw && (
        <div className="mx-4 sm:mx-6 mt-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2 text-xs text-rose-300">
          <IconAlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <p>This community is marked NSFW. Posts may contain adult content.</p>
        </div>
      )}

      {/* Posts */}
      <div className="mt-6 px-4 sm:px-6">
        {posts.length === 0 ? (
          <div className="rounded-xl bg-white/5 border border-white/5 p-10 text-center">
            <p className="text-foreground/50 mb-3">
              No posts in this community yet.
            </p>
            {community.isMember && (
              <p className="text-sm text-foreground/40">
                When you create a post, you'll be able to share it here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <div key={post.id}>
                <div className="flex items-center justify-between mb-1.5">
                  {post.isPinned ? (
                    <div className="flex items-center gap-1 text-xs text-vocl-accent">
                      <IconPinFilled size={12} />
                      <span>Pinned</span>
                    </div>
                  ) : <span />}
                  {(community.myRole === "moderator" || community.myRole === "owner") && (
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleTogglePin(post.id, post.isPinned)}
                        disabled={busyPostAction[`pin-${post.id}`]}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-xs text-foreground/70"
                      >
                        <IconPin size={12} /> {post.isPinned ? "Unpin" : "Pin"}
                      </button>
                      <button
                        onClick={() => handleRemovePost(post.id)}
                        disabled={busyPostAction[`remove-${post.id}`]}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400"
                      >
                        <IconTrash size={12} /> Remove
                      </button>
                    </div>
                  )}
                </div>
                <InteractivePost
                  id={post.id}
                  author={{
                    username: post.author.username,
                    avatarUrl: post.author.avatarUrl || "",
                  }}
                  authorId={post.authorId}
                  timestamp={post.createdAt}
                  contentType={post.postType as any}
                  initialStats={{
                    comments: post.commentCount,
                    likes: post.likeCount,
                    reblogs: post.reblogCount,
                  }}
                  initialInteractions={{
                    hasCommented: false,
                    hasLiked: post.hasLiked,
                    hasReblogged: false,
                  }}
                  isSensitive={post.isSensitive}
                  tags={post.tags}
                >
                  {renderPostContent(post)}
                </InteractivePost>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => load(posts.length, true)}
                disabled={loadingMore}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm text-foreground/70 transition-colors"
              >
                {loadingMore ? (
                  <IconLoader2 size={18} className="animate-spin mx-auto" />
                ) : (
                  "Load more"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    </PullToRefresh>
  );
}
