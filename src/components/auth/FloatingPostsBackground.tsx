"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  IconMessage,
  IconHeart,
  IconHeartFilled,
  IconRefresh,
  IconBrandSpotify,
  IconPlayerPlayFilled,
  IconCamera,
  IconBrandUnsplash,
} from "@tabler/icons-react";

// =============================================================================
// Types
// =============================================================================

type SamplePostType = "text" | "image" | "audio" | "gallery";

interface SamplePost {
  type: SamplePostType;
  author: {
    username: string;
    avatar: string; // initials-based color avatar
  };
  timestamp: string;
  content?: string;
  imageUrl?: string;
  images?: string[];
  caption?: string;
  unsplashCredit?: string;
  spotifyTrack?: {
    title: string;
    artist: string;
    albumArt: string;
  };
  stats: {
    comments: number;
    likes: number;
    reblogs: number;
  };
  interactions: {
    hasLiked: boolean;
    hasCommented: boolean;
  };
  tags?: string[];
}

interface FloatingPost extends SamplePost {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  direction: number;
  opacity: number;
}

// =============================================================================
// Sample Posts — showcasing platform features
// =============================================================================

const samplePosts: SamplePost[] = [
  // Text post — witty
  {
    type: "text",
    author: { username: "nora_writes", avatar: "#E87461" },
    timestamp: "2h ago",
    content:
      "I told my therapist about my imposter syndrome and she said I was doing a great job pretending to have it.",
    stats: { comments: 14, likes: 203, reblogs: 42 },
    interactions: { hasLiked: true, hasCommented: false },
    tags: ["humour", "thoughts"],
  },
  // Image post — stunning landscape with Unsplash credit
  {
    type: "image",
    author: { username: "kai.shoots", avatar: "#5B9A8B" },
    timestamp: "4h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=260&fit=crop",
    caption: "Dolomites at golden hour. No filter needed.",
    unsplashCredit: "Kalen Emsley",
    stats: { comments: 31, likes: 587, reblogs: 89 },
    interactions: { hasLiked: true, hasCommented: true },
    tags: ["photography", "travel"],
  },
  // Text post — relatable
  {
    type: "text",
    author: { username: "dev_mika", avatar: "#7C6FBE" },
    timestamp: "6h ago",
    content:
      "Stages of debugging:\n1. That can't happen.\n2. That doesn't happen on my machine.\n3. That shouldn't happen.\n4. Why does that happen?\n5. Oh, I see.\n6. How did that ever work?",
    stats: { comments: 47, likes: 891, reblogs: 215 },
    interactions: { hasLiked: false, hasCommented: false },
    tags: ["coding", "relatable"],
  },
  // Audio post — Spotify showcase
  {
    type: "audio",
    author: { username: "melody.box", avatar: "#D4A574" },
    timestamp: "1h ago",
    content: "This song has been living in my head rent-free all week.",
    spotifyTrack: {
      title: "Glimpse of Us",
      artist: "Joji",
      albumArt:
        "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=80&h=80&fit=crop",
    },
    stats: { comments: 8, likes: 124, reblogs: 19 },
    interactions: { hasLiked: true, hasCommented: false },
    tags: ["music", "vibes"],
  },
  // Image post — food photography
  {
    type: "image",
    author: { username: "plated_", avatar: "#E8A87C" },
    timestamp: "3h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=260&fit=crop",
    caption: "Sunday brunch done right.",
    stats: { comments: 22, likes: 341, reblogs: 45 },
    interactions: { hasLiked: false, hasCommented: true },
    tags: ["food", "aesthetic"],
  },
  // Text post — thoughtful
  {
    type: "text",
    author: { username: "sol.journal", avatar: "#8BB8A8" },
    timestamp: "8h ago",
    content:
      "Reminder: the person you were a year ago would be so proud of where you are now. Growth is quiet, but it's real.",
    stats: { comments: 56, likes: 1247, reblogs: 302 },
    interactions: { hasLiked: true, hasCommented: true },
    tags: ["growth", "positivity"],
  },
  // Image post — Unsplash showcase (pet)
  {
    type: "image",
    author: { username: "paws.inc", avatar: "#F2A365" },
    timestamp: "5h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=260&fit=crop",
    caption: "This face is the reason I'm late to everything.",
    unsplashCredit: "Alvan Nee",
    stats: { comments: 89, likes: 2103, reblogs: 156 },
    interactions: { hasLiked: true, hasCommented: false },
    tags: ["dogs", "cute"],
  },
  // Text post — cultural
  {
    type: "text",
    author: { username: "page.turner", avatar: "#B8D4E3" },
    timestamp: "12h ago",
    content:
      "Just finished \"Tomorrow, and Tomorrow, and Tomorrow\" and I need everyone to stop what they're doing and read it immediately.",
    stats: { comments: 33, likes: 412, reblogs: 78 },
    interactions: { hasLiked: false, hasCommented: false },
    tags: ["books", "recommendation"],
  },
  // Image post — architecture
  {
    type: "image",
    author: { username: "urban.eye", avatar: "#6C8EAD" },
    timestamp: "7h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400&h=260&fit=crop",
    caption: "Geometry lesson courtesy of Manhattan.",
    unsplashCredit: "Andre Benz",
    stats: { comments: 15, likes: 467, reblogs: 61 },
    interactions: { hasLiked: false, hasCommented: false },
    tags: ["architecture", "cityscape"],
  },
  // Audio post — music discovery
  {
    type: "audio",
    author: { username: "vinyl.drift", avatar: "#C97B63" },
    timestamp: "30m ago",
    content: "Found this gem on a random playlist. You're welcome.",
    spotifyTrack: {
      title: "Saturn",
      artist: "SZA",
      albumArt:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=80&h=80&fit=crop",
    },
    stats: { comments: 5, likes: 67, reblogs: 11 },
    interactions: { hasLiked: false, hasCommented: false },
    tags: ["music", "discovery"],
  },
  // Text post — witty one-liner
  {
    type: "text",
    author: { username: "half.asleep", avatar: "#9B8EC5" },
    timestamp: "9h ago",
    content:
      "My WiFi went down for five minutes so I had to talk to my family. They seem like nice people.",
    stats: { comments: 28, likes: 673, reblogs: 189 },
    interactions: { hasLiked: true, hasCommented: false },
  },
  // Image post — nature close-up
  {
    type: "image",
    author: { username: "macro.world", avatar: "#7BAE7F" },
    timestamp: "10h ago",
    imageUrl:
      "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=400&h=260&fit=crop",
    caption: "Morning dew on a spider web. Nature's jewellery.",
    unsplashCredit: "Krzysztof Niewolny",
    stats: { comments: 19, likes: 534, reblogs: 72 },
    interactions: { hasLiked: true, hasCommented: true },
    tags: ["nature", "macro"],
  },
];

// =============================================================================
// Avatar — simple colored circle with initials
// =============================================================================

function FakeAvatar({
  color,
  username,
}: {
  color: string;
  username: string;
}) {
  const initials = username.charAt(0).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display text-sm font-semibold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// =============================================================================
// Post Card Variants
// =============================================================================

function ActionBar({
  stats,
  interactions,
}: {
  stats: SamplePost["stats"];
  interactions: SamplePost["interactions"];
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-3 py-2"
      style={{ backgroundColor: "var(--vocl-action-bar)" }}
    >
      <div className="flex items-center gap-1">
        <IconMessage
          size={16}
          className={
            interactions.hasCommented ? "text-vocl-comment" : "text-neutral-400"
          }
        />
        <span
          className={`text-xs ${interactions.hasCommented ? "text-vocl-comment" : "text-neutral-400"}`}
        >
          {stats.comments}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {interactions.hasLiked ? (
          <IconHeartFilled size={16} className="text-vocl-like" />
        ) : (
          <IconHeart size={16} className="text-neutral-400" />
        )}
        <span
          className={`text-xs ${interactions.hasLiked ? "text-vocl-like" : "text-neutral-400"}`}
        >
          {stats.likes}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <IconRefresh size={16} className="text-neutral-400" />
        <span className="text-xs text-neutral-400">{stats.reblogs}</span>
      </div>
    </div>
  );
}

function PostCardHeader({ post }: { post: SamplePost }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/60"
      style={{ backgroundColor: "var(--vocl-surface-muted)" }}
    >
      <FakeAvatar color={post.author.avatar} username={post.author.username} />
      <div className="flex flex-col min-w-0">
        <span className="font-display text-sm font-normal text-neutral-900 truncate">
          {post.author.username}
        </span>
        <span className="text-[10px] text-neutral-400 -mt-0.5">
          {post.timestamp}
        </span>
      </div>
    </div>
  );
}

function TagPills({ tags }: { tags: string[] }) {
  return (
    <div className="flex gap-1 flex-wrap px-3 pb-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="text-[10px] px-1.5 py-0.5 rounded-full bg-vocl-accent/10 text-vocl-accent"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

function TextPostCard({ post }: { post: FloatingPost }) {
  return (
    <>
      <PostCardHeader post={post} />
      <div className="px-3 pt-2.5 pb-2 bg-[#EBEBEB]">
        <p className="text-xs text-neutral-700 font-light leading-relaxed whitespace-pre-line line-clamp-5">
          {post.content}
        </p>
      </div>
      {post.tags && post.tags.length > 0 && <TagPills tags={post.tags} />}
      <ActionBar stats={post.stats} interactions={post.interactions} />
    </>
  );
}

function ImagePostCard({ post }: { post: FloatingPost }) {
  return (
    <>
      <PostCardHeader post={post} />
      {post.imageUrl && (
        <div className="relative w-full h-36">
          <Image
            src={post.imageUrl}
            alt={post.caption || "Post image"}
            fill
            className="object-cover"
            unoptimized
          />
          {/* Unsplash credit badge */}
          {post.unsplashCredit && (
            <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
              <IconBrandUnsplash size={10} className="text-white" />
              <span className="text-[9px] text-white/90">
                {post.unsplashCredit}
              </span>
            </div>
          )}
          {/* Camera icon for gallery feel */}
          {!post.unsplashCredit && (
            <div className="absolute top-1.5 right-1.5 bg-black/40 backdrop-blur-sm rounded-full p-1">
              <IconCamera size={12} className="text-white" />
            </div>
          )}
        </div>
      )}
      {post.caption && (
        <div className="px-3 pt-2 pb-1.5 bg-[#EBEBEB]">
          <p className="text-xs text-neutral-700 font-light leading-relaxed line-clamp-2">
            {post.caption}
          </p>
        </div>
      )}
      {post.tags && post.tags.length > 0 && <TagPills tags={post.tags} />}
      <ActionBar stats={post.stats} interactions={post.interactions} />
    </>
  );
}

function AudioPostCard({ post }: { post: FloatingPost }) {
  return (
    <>
      <PostCardHeader post={post} />
      {post.content && (
        <div className="px-3 pt-2 pb-1.5 bg-[#EBEBEB]">
          <p className="text-xs text-neutral-700 font-light leading-relaxed line-clamp-2">
            {post.content}
          </p>
        </div>
      )}
      {/* Spotify-style player */}
      {post.spotifyTrack && (
        <div className="mx-3 my-2 flex items-center gap-2.5 bg-neutral-900 rounded-lg p-2">
          <div className="relative w-10 h-10 rounded overflow-hidden shrink-0">
            <Image
              src={post.spotifyTrack.albumArt}
              alt={post.spotifyTrack.title}
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <IconPlayerPlayFilled size={14} className="text-white" />
            </div>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[11px] font-medium text-white truncate">
              {post.spotifyTrack.title}
            </span>
            <span className="text-[10px] text-neutral-400 truncate">
              {post.spotifyTrack.artist}
            </span>
          </div>
          <IconBrandSpotify size={18} className="text-[#1DB954] shrink-0" />
        </div>
      )}
      {post.tags && post.tags.length > 0 && <TagPills tags={post.tags} />}
      <ActionBar stats={post.stats} interactions={post.interactions} />
    </>
  );
}

// =============================================================================
// Main PostCard renderer
// =============================================================================

function PostCard({ post }: { post: FloatingPost }) {
  return (
    <div
      className="absolute w-60 rounded-2xl bg-vocl-surface shadow-xl overflow-hidden pointer-events-none border border-neutral-200/30"
      style={{
        left: `${post.x}%`,
        top: `${post.y}%`,
        transform: `rotate(${post.rotation}deg) scale(${post.scale})`,
        opacity: post.opacity,
        transition:
          "transform 0.1s linear, left 0.1s linear, top 0.1s linear",
      }}
    >
      {post.type === "text" && <TextPostCard post={post} />}
      {post.type === "image" && <ImagePostCard post={post} />}
      {post.type === "audio" && <AudioPostCard post={post} />}
    </div>
  );
}

// =============================================================================
// Background Component
// =============================================================================

export function FloatingPostsBackground() {
  const [posts, setPosts] = useState<FloatingPost[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const initialPosts = useMemo(() => {
    return samplePosts.map((sample, index) => ({
      ...sample,
      id: index,
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      rotation: Math.random() * 16 - 8, // -8 to 8 degrees — slightly tighter
      scale: 0.65 + Math.random() * 0.25, // 0.65 to 0.9
      speed: 0.015 + Math.random() * 0.025, // Slow drift
      direction: Math.random() * Math.PI * 2,
      opacity: 0.35 + Math.random() * 0.3, // 0.35 to 0.65
    }));
  }, []);

  useEffect(() => {
    setPosts(initialPosts);
    setDimensions({ width: window.innerWidth, height: window.innerHeight });

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [initialPosts]);

  // Animate posts
  useEffect(() => {
    if (posts.length === 0) return;

    const animate = () => {
      setPosts((prevPosts) =>
        prevPosts.map((post) => {
          let newX = post.x + Math.cos(post.direction) * post.speed;
          let newY = post.y + Math.sin(post.direction) * post.speed;
          let newDirection = post.direction;

          if (newX < -5 || newX > 92) {
            newDirection = Math.PI - newDirection;
            newX = Math.max(-5, Math.min(92, newX));
          }
          if (newY < -5 || newY > 88) {
            newDirection = -newDirection;
            newY = Math.max(-5, Math.min(88, newY));
          }

          const newRotation =
            post.rotation + (Math.random() - 0.5) * 0.08;

          return {
            ...post,
            x: newX,
            y: newY,
            direction: newDirection,
            rotation: Math.max(-12, Math.min(12, newRotation)),
          };
        })
      );
    };

    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (dimensions.width === 0) {
    return <div className="fixed inset-0 bg-background -z-10" />;
  }

  return (
    <div className="fixed inset-0 bg-background -z-10 overflow-hidden">
      {/* Gradient overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/65 to-background/90 z-10" />

      {/* Floating posts */}
      <div className="absolute inset-0">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
