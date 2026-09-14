"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  IconX,
  IconLoader2,
  IconPhoto,
  IconPlayerPlayFilled,
  IconBrandSpotify,
  IconMicrophone,
  IconVideo,
  IconMusic,
} from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import { getExploreData } from "@/actions/explore";
import { followUser, unfollowUser } from "@/actions/follows";
import { toast, PullToRefresh } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/lib/motion";

/** Editorial section band header: a mono slug over a full hairline rule, with an
 *  optional right-aligned mono aside (e.g. a count). */
function SectionBand({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-rule pb-3">
      <span className="slug text-meta">{children}</span>
      {aside && <span className="slug text-meta-dim">{aside}</span>}
    </div>
  );
}

/** Kicker label for a post type, matching the paper's vocabulary. */
function postKicker(postType: string): string {
  switch (postType) {
    case "image":
    case "gallery":
      return "Photo";
    case "video":
      return "Video";
    case "audio":
      return "Listen";
    case "poll":
      return "Poll";
    case "ask":
      return "Ask";
    default:
      return "Note";
  }
}

interface TrendingTag {
  id: string;
  name: string;
  postCount: number;
}

interface PopularTag {
  id: string;
  name: string;
  totalPosts: number;
}

interface TrendingPost {
  id: string;
  author: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  postType: string;
  snippet: string;
  hasMedia: boolean;
  thumbnailUrl: string | null;
  imageUrls?: string[];
  spotifyTrackId?: string;
  mediaUrl?: string;
  videoEmbedUrl?: string;
  likeCount: number;
  commentCount: number;
  reblogCount: number;
  createdAt: string;
}

interface RisingCreator {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  postCount: number;
}

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [risingCreators, setRisingCreators] = useState<RisingCreator[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const result = await getExploreData();
    if (result.success) {
      setTrendingTags(result.trendingTags || []);
      setPopularTags(result.popularTags || []);
      setRisingCreators(result.risingCreators || []);
      setTrendingPosts(result.trendingPosts || []);
    } else {
      toast.error(result.error || "Failed to load explore data");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFollowToggle = async (userId: string) => {
    const isCurrentlyFollowing = followingMap[userId] || false;
    setFollowLoadingMap((prev) => ({ ...prev, [userId]: true }));

    const result = isCurrentlyFollowing
      ? await unfollowUser(userId)
      : await followUser(userId);

    if (result.success) {
      setFollowingMap((prev) => ({ ...prev, [userId]: !isCurrentlyFollowing }));
      toast.success(isCurrentlyFollowing ? "Unsubscribed" : "Subscribed!");
    } else {
      toast.error("Failed to update follow status");
    }

    setFollowLoadingMap((prev) => ({ ...prev, [userId]: false }));
  };

  if (isLoading) {
    return <ExploreSkeleton />;
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <title>Explore | be.vocl</title>
    <MotionConfig reducedMotion="user">
    <div className="py-6 max-w-6xl mx-auto px-4 sm:px-6">
      {/* Editorial masthead */}
      <motion.header className="mb-1" initial="hidden" animate="show" variants={fadeUp}>
        <span className="kicker kicker-accent">The Newsstand</span>
        <h1 className="type-display-lg text-ink mt-2">Explore</h1>
        <p className="editorial-deck mt-1">
          Trending topics, rising voices, and stories worth reading.
        </p>
      </motion.header>

      {/* Search row — mono label, serif placeholder, CTRL K hint; submits to /search */}
      <form
        onSubmit={handleSearchSubmit}
        className="mt-5 mb-10 flex items-center gap-3 py-3.5 border-t border-rule rule-double-b"
      >
        <span className="slug text-meta-dim flex-shrink-0">Search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="@users, #tags, or posts…"
          className="flex-1 min-w-0 bg-transparent border-0 font-serif italic text-lg text-ink placeholder:text-meta-dim focus:outline-none"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-meta hover:text-ink flex-shrink-0"
            aria-label="Clear search"
          >
            <IconX size={18} />
          </button>
        ) : (
          <span className="slug text-meta-dim border border-rule px-2 py-1 flex-shrink-0">Ctrl K</span>
        )}
      </form>

      <div className="space-y-14">
        {/* Trending Stories — lead-plus-columns editorial grid */}
        {trendingPosts.length > 0 && (
          <section>
            <SectionBand aside={`${trendingPosts.length} filed · 24h`}>Trending stories</SectionBand>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-10"
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.05)}
            >
              {trendingPosts.map((post, i) => {
                const isLead = i === 0;
                return (
                  <motion.div
                    key={post.id}
                    variants={fadeUp}
                    className={isLead ? "" : "md:border-l md:border-rule md:pl-8"}
                  >
                    <Link href={`/post/${post.id}`} className="group block">
                      {isLead && (
                        <div className="mb-3">
                          <TrendingPostMedia post={post} />
                        </div>
                      )}
                      <span className="kicker kicker-accent">{postKicker(post.postType)}</span>
                      {post.snippet && (
                        <h2
                          className={`${isLead ? "type-display" : "type-heading"} text-ink mt-2 line-clamp-3 group-hover:text-accent transition-colors`}
                        >
                          {post.snippet}
                        </h2>
                      )}
                      <div className="byline text-meta mt-2">
                        {post.author.username} · {post.likeCount} likes
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        )}

        {/* Classified index — every section, set in Gloock and sized by how
            much has been filed to it (bigger = busier). */}
        <section>
          <SectionBand aside={popularTags.length ? `${popularTags.length} sections` : undefined}>
            Sections · Classified index
          </SectionBand>
          {popularTags.length > 0 ? (
            (() => {
              const max = Math.max(...popularTags.map((t) => t.totalPosts), 1);
              return (
                <div className="columns-2 sm:columns-3 lg:columns-4 gap-x-8 [column-rule:1px_solid_var(--rule)]">
                  {popularTags.map((tag) => {
                    const size = 16 + Math.round((tag.totalPosts / max) * 18); // 16–34px
                    return (
                      <div
                        key={tag.id}
                        className="break-inside-avoid border-b border-rule py-2 flex items-baseline gap-2"
                      >
                        <Link
                          href={`/tag/${encodeURIComponent(tag.name)}`}
                          className="font-display text-ink hover:text-accent transition-colors leading-tight"
                          style={{ fontSize: `${size}px` }}
                        >
                          {tag.name}
                        </Link>
                        <span className="slug text-meta-dim">{tag.totalPosts}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <p className="editorial-body text-meta">No sections in print yet.</p>
          )}
        </section>

        {/* Rising voices | Trending tags — two-column foot */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          <div>
            <SectionBand>Rising voices</SectionBand>
            {risingCreators.length > 0 ? (
              <div className="divide-y divide-rule">
                {risingCreators.map((creator) => (
                  <div key={creator.id} className="flex items-start gap-3 py-4 first:pt-0">
                    <Link
                      href={`/profile/${creator.username}`}
                      className="relative w-12 h-12 overflow-hidden flex-shrink-0 bg-panel"
                    >
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.username}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-display text-lg text-meta">
                          {creator.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </Link>

                    <Link href={`/profile/${creator.username}`} className="flex-1 min-w-0">
                      <p className="type-heading text-ink truncate hover:text-accent transition-colors">
                        {creator.displayName || creator.username}
                      </p>
                      <p className="byline text-meta truncate mt-0.5">@{creator.username}</p>
                      {creator.bio && (
                        <p className="editorial-caption not-italic text-meta mt-1 line-clamp-1">
                          {creator.bio}
                        </p>
                      )}
                      <div className="byline text-meta-dim mt-1.5">
                        {creator.followerCount.toLocaleString()} followers · {creator.postCount.toLocaleString()} posts
                      </div>
                    </Link>

                    <button
                      onClick={() => handleFollowToggle(creator.id)}
                      disabled={followLoadingMap[creator.id]}
                      className={`flex-shrink-0 border px-4 py-2 font-sans font-medium uppercase tracking-[0.16em] text-[11px] transition-colors ${
                        followingMap[creator.id]
                          ? "border-rule text-meta hover:text-vocl-like"
                          : "border-foreground text-ink hover:bg-vocl-hover"
                      }`}
                    >
                      {followLoadingMap[creator.id] ? (
                        <IconLoader2 size={14} className="animate-spin" />
                      ) : followingMap[creator.id] ? (
                        "Subscribing"
                      ) : (
                        "Subscribe"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="editorial-body italic text-meta">
                Nobody new on the masthead this week. Check back after tonight&apos;s edition.
              </p>
            )}
          </div>

          <div>
            <SectionBand aside="24h">Trending tags</SectionBand>
            {trendingTags.length > 0 ? (
              <div className="divide-y divide-rule">
                {trendingTags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${encodeURIComponent(tag.name)}`}
                    className="group flex items-baseline justify-between py-2.5"
                  >
                    <span className="font-display text-lg text-ink group-hover:text-accent transition-colors">
                      {tag.name}
                    </span>
                    <span className="slug text-meta-dim">{tag.postCount}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="editorial-body italic text-meta">
                Quiet day. Nothing has caught yet — the index above is the whole paper.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
    </MotionConfig>
    </PullToRefresh>
  );
}

function TrendingPostMedia({ post }: { post: TrendingPost }) {
  const { postType, thumbnailUrl, imageUrls, spotifyTrackId, videoEmbedUrl } = post;

  if (postType === "text" || postType === "poll") return null;

  // Gallery with 2+ images → collage
  if (postType === "gallery" && imageUrls && imageUrls.length >= 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-black/20 aspect-[16/10]">
        {imageUrls.slice(0, 4).map((url, i) => (
          <div key={i} className="relative overflow-hidden">
            <Image src={url} alt="" fill className="object-cover" sizes="(max-width:640px) 50vw, 300px" />
            {i === 3 && imageUrls.length > 4 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold">
                +{imageUrls.length - 4}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (postType === "image" || postType === "gallery") {
    if (!thumbnailUrl) {
      return (
        <div className="aspect-[16/10] ph-image">
          <IconPhoto size={36} className="text-meta-dim" />
        </div>
      );
    }
    return (
      <div className="relative aspect-[16/10] bg-black/20">
        <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="(max-width:640px) 100vw, 600px" />
      </div>
    );
  }

  if (postType === "video") {
    return (
      <div className="relative aspect-video bg-black flex items-center justify-center">
        {thumbnailUrl ? (
          <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="(max-width:640px) 100vw, 600px" />
        ) : (
          <IconVideo size={40} className="text-white/30" />
        )}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <IconPlayerPlayFilled size={20} className="text-white ml-0.5" />
          </div>
        </div>
        {videoEmbedUrl && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium">
            Embed
          </span>
        )}
      </div>
    );
  }

  if (postType === "audio") {
    // Spotify embed-style preview
    if (spotifyTrackId && thumbnailUrl) {
      return (
        <div className="relative aspect-[16/6] bg-panel flex items-center gap-3 p-3">
          <div className="relative w-16 h-16 overflow-hidden flex-shrink-0 bg-black/20">
            <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1 text-xs text-[#1DB954] font-medium mb-1">
              <IconBrandSpotify size={14} />
              Spotify
            </div>
            <p className="text-xs text-foreground/60 truncate">
              Track preview on Spotify
            </p>
          </div>
        </div>
      );
    }
    // Voice note or file
    const isVoice = (post as any).content?.is_voice_note;
    return (
      <div className="relative aspect-[16/6] bg-panel flex items-center gap-3 p-3">
        {thumbnailUrl ? (
          <div className="relative w-16 h-16 overflow-hidden flex-shrink-0 bg-black/20">
            <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
          </div>
        ) : (
          <div className="w-16 h-16 bg-panel flex items-center justify-center flex-shrink-0">
            {isVoice ? (
              <IconMicrophone size={24} className="text-meta" />
            ) : (
              <IconMusic size={24} className="text-meta" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 text-xs text-accent font-medium">
            {isVoice ? (
              <>
                <IconMicrophone size={14} /> Voice note
              </>
            ) : (
              <>
                <IconMusic size={14} /> Audio
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ExploreSkeleton() {
  return (
    <div className="py-6 max-w-6xl mx-auto px-4 sm:px-6 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-vocl-hover-strong rounded-none" />
        <div className="h-4 w-64 bg-vocl-hover rounded-none mt-2" />
      </div>

      <div className="space-y-10">
        {/* Trending skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded-none" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-9 rounded-none bg-vocl-hover"
                style={{ width: `${60 + Math.random() * 60}px` }}
              />
            ))}
          </div>
        </section>

        {/* Popular topics skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded-none" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-none" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-none bg-vocl-hover" />
            ))}
          </div>
        </section>

        {/* Rising creators skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded-none" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-none" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-none bg-vocl-hover"
              >
                <div className="w-12 h-12 rounded-none bg-vocl-hover-strong flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-vocl-hover-strong rounded-none" />
                  <div className="h-3 w-20 bg-vocl-hover rounded-none" />
                  <div className="h-3 w-48 bg-vocl-hover rounded-none" />
                </div>
                <div className="h-8 w-20 bg-vocl-hover-strong rounded-none flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
