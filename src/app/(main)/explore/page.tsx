"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  IconSearch,
  IconX,
  IconHash,
  IconLoader2,
  IconUsers,
  IconNotes,
  IconHeart,
  IconMessage,
  IconRefresh,
  IconPhoto,
  IconPlayerPlayFilled,
  IconBrandSpotify,
  IconMicrophone,
  IconVideo,
  IconMusic,
  IconCompass,
} from "@tabler/icons-react";
import { motion, MotionConfig } from "framer-motion";
import { getExploreData } from "@/actions/explore";
import { followUser, unfollowUser } from "@/actions/follows";
import { toast, PullToRefresh } from "@/components/ui";
import { fadeUp, staggerContainer } from "@/lib/motion";

/** Editorial section band header: uppercase kicker + hairline rule. */
function SectionBand({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="type-meta uppercase tracking-widest text-foreground/50 font-semibold">
        {children}
      </span>
      <span className="h-px flex-1 bg-vocl-border" />
    </div>
  );
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
      toast.success(isCurrentlyFollowing ? "Unfollowed" : "Following!");
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
    <div className="py-3 sm:py-6 max-w-2xl mx-auto px-2 sm:px-4">
      {/* Editorial masthead */}
      <motion.header
        className="mb-6 border-b border-vocl-border pb-5"
        initial="hidden"
        animate="show"
        variants={fadeUp}
      >
        <span className="type-meta uppercase tracking-widest text-vocl-primary font-semibold">
          The Newsstand
        </span>
        <h1 className="type-display-lg text-foreground mt-1 flex items-center gap-3">
          <IconCompass size={30} className="text-vocl-primary flex-shrink-0" />
          Explore
        </h1>
        <p className="type-body text-foreground/55 mt-1">
          Trending topics, rising voices, and stories worth reading.
        </p>
      </motion.header>

      {/* Search bar — submits to /search */}
      <form onSubmit={handleSearchSubmit} className="relative mb-10">
        <IconSearch
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search @users, #tags, or posts..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-vocl-surface-dark border border-vocl-border text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent focus:border-transparent text-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
            aria-label="Clear search"
          >
            <IconX size={18} />
          </button>
        )}
      </form>

      <div className="space-y-12">
        {/* Trending Now */}
        <section>
          <SectionBand>Trending Tags</SectionBand>
          {trendingTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {trendingTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-vocl-border hover:border-vocl-primary/50 transition-colors"
                >
                  <IconHash
                    size={14}
                    className="text-vocl-primary"
                  />
                  <span className="text-sm font-medium text-foreground group-hover:text-vocl-primary transition-colors">
                    {tag.name}
                  </span>
                  <span className="type-meta text-foreground/40 ml-0.5">
                    {tag.postCount}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="type-body text-foreground/45 py-2">
              No trending tags in the last 24 hours.
            </p>
          )}
        </section>

        {/* Trending Posts */}
        {trendingPosts.length > 0 && (
          <section>
            <SectionBand>Trending Stories</SectionBand>
            <motion.div
              className="divide-y divide-vocl-border"
              initial="hidden"
              animate="show"
              variants={staggerContainer(0.05)}
            >
              {trendingPosts.map((post) => (
                <motion.div key={post.id} variants={fadeUp}>
                <Link
                  href={`/post/${post.id}`}
                  className="group block overflow-hidden py-5 first:pt-0"
                >
                  {/* Media preview */}
                  <TrendingPostMedia post={post} />

                  {/* Body */}
                  <div className={post.postType === "text" || post.postType === "poll" ? "" : "pt-3"}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="relative w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                        {post.author.avatarUrl ? (
                          <Image
                            src={post.author.avatarUrl}
                            alt={post.author.username}
                            fill
                            className="object-cover"
                            sizes="24px"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                            <span className="text-[10px] font-bold text-white">
                              {post.author.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-foreground truncate">
                        {post.author.displayName || post.author.username}
                      </span>
                      <span className="text-foreground/40 text-xs truncate">
                        @{post.author.username}
                      </span>
                    </div>
                    {post.snippet && (
                      <p className="type-heading text-foreground line-clamp-2 group-hover:text-vocl-primary transition-colors">
                        {post.snippet}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 type-meta text-foreground/40">
                      <span className="flex items-center gap-1">
                        <IconHeart size={12} />
                        {post.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconMessage size={12} />
                        {post.commentCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <IconRefresh size={12} />
                        {post.reblogCount}
                      </span>
                    </div>
                  </div>
                </Link>
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Popular Topics */}
        <section>
          <SectionBand>Sections</SectionBand>
          {popularTags.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-6">
              {popularTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${encodeURIComponent(tag.name)}`}
                  className="group border-t border-vocl-border pt-4"
                >
                  <p className="type-heading text-foreground truncate group-hover:text-vocl-primary transition-colors flex items-center gap-1">
                    <IconHash size={18} className="text-vocl-primary flex-shrink-0" />
                    {tag.name}
                  </p>
                  <p className="type-meta text-foreground/45 mt-1">
                    {tag.totalPosts.toLocaleString()}{" "}
                    {tag.totalPosts === 1 ? "post" : "posts"}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="type-body text-foreground/45 py-2">
              No popular topics yet.
            </p>
          )}
        </section>

        {/* Rising Creators */}
        <section>
          <SectionBand>Rising Voices</SectionBand>
          {risingCreators.length > 0 ? (
            <div className="divide-y divide-vocl-border">
              {risingCreators.map((creator) => (
                <div
                  key={creator.id}
                  className="flex items-center gap-3 py-4 first:pt-0"
                >
                  <Link
                    href={`/profile/${creator.username}`}
                    className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                  >
                    {creator.avatarUrl ? (
                      <Image
                        src={creator.avatarUrl}
                        alt={creator.username}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {creator.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </Link>

                  <Link
                    href={`/profile/${creator.username}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="type-heading text-foreground truncate hover:text-vocl-primary transition-colors">
                      {creator.displayName || creator.username}
                    </p>
                    <p className="type-meta text-foreground/50 truncate">
                      @{creator.username}
                    </p>
                    {creator.bio && (
                      <p className="type-body text-foreground/60 mt-1 line-clamp-1">
                        {creator.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 type-meta text-foreground/40">
                        <IconUsers size={12} />
                        {creator.followerCount.toLocaleString()}{" "}
                        {creator.followerCount === 1
                          ? "follower"
                          : "followers"}
                      </span>
                      <span className="flex items-center gap-1 type-meta text-foreground/40">
                        <IconNotes size={12} />
                        {creator.postCount.toLocaleString()}{" "}
                        {creator.postCount === 1 ? "post" : "posts"}
                      </span>
                    </div>
                  </Link>

                  <button
                    onClick={() => handleFollowToggle(creator.id)}
                    disabled={followLoadingMap[creator.id]}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                      followingMap[creator.id]
                        ? "border border-vocl-border text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                        : "bg-vocl-primary text-white hover:bg-vocl-primary-hover"
                    }`}
                  >
                    {followLoadingMap[creator.id] ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : followingMap[creator.id] ? (
                      "Following"
                    ) : (
                      "Follow"
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="type-body text-foreground/45 py-2">
              No rising creators to show right now.
            </p>
          )}
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
        <div className="aspect-[16/10] bg-gradient-to-br from-vocl-accent/10 to-vocl-accent/5 flex items-center justify-center">
          <IconPhoto size={36} className="text-vocl-accent/40" />
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
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium">
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
        <div className="relative aspect-[16/6] bg-gradient-to-br from-[#1DB954]/20 to-black/40 flex items-center gap-3 p-3">
          <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-black/20">
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
      <div className="relative aspect-[16/6] bg-gradient-to-br from-vocl-accent/20 to-vocl-accent/5 flex items-center gap-3 p-3">
        {thumbnailUrl ? (
          <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-black/20">
            <Image src={thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-md bg-vocl-accent/20 flex items-center justify-center flex-shrink-0">
            {isVoice ? (
              <IconMicrophone size={24} className="text-vocl-accent" />
            ) : (
              <IconMusic size={24} className="text-vocl-accent" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1 text-xs text-vocl-accent font-medium">
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
    <div className="py-3 sm:py-6 max-w-2xl mx-auto px-2 sm:px-4 animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-32 bg-vocl-hover-strong rounded-lg" />
        <div className="h-4 w-64 bg-vocl-hover rounded-lg mt-2" />
      </div>

      <div className="space-y-10">
        {/* Trending skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-lg" />
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-9 rounded-full bg-vocl-hover"
                style={{ width: `${60 + Math.random() * 60}px` }}
              />
            ))}
          </div>
        </section>

        {/* Popular topics skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-lg" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-vocl-hover" />
            ))}
          </div>
        </section>

        {/* Rising creators skeleton */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-vocl-hover-strong rounded" />
            <div className="h-5 w-36 bg-vocl-hover-strong rounded-lg" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-xl bg-vocl-hover"
              >
                <div className="w-12 h-12 rounded-full bg-vocl-hover-strong flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-vocl-hover-strong rounded" />
                  <div className="h-3 w-20 bg-vocl-hover rounded" />
                  <div className="h-3 w-48 bg-vocl-hover rounded" />
                </div>
                <div className="h-8 w-20 bg-vocl-hover-strong rounded-lg flex-shrink-0" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
