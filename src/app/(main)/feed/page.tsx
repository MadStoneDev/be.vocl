"use client";

import { useState } from "react";
import { FeedTabs, FeedList, type FeedTab } from "@/components/feed";
import type { PostStats, PostInteractions } from "@/components/Post";

// Demo data for now - will be replaced with real data from Supabase
const demoPosts = [
  {
    id: "1",
    author: {
      username: "naturelover",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    timestamp: "2h ago",
    contentType: "image" as const,
    content: {
      imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&h=400&fit=crop",
    },
    stats: { comments: 24, likes: 189, reblogs: 45 },
    interactions: { hasCommented: false, hasLiked: false, hasReblogged: false },
  },
  {
    id: "2",
    author: {
      username: "thoughtful_writer",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    timestamp: "4h ago",
    contentType: "text" as const,
    content: {
      text: "Sometimes the smallest step in the right direction ends up being the biggest step of your life. Tip toe if you must, but take the step.\n\nWhat's one small step you're taking today?",
    },
    stats: { comments: 56, likes: 423, reblogs: 112 },
    interactions: { hasCommented: true, hasLiked: true, hasReblogged: false },
  },
  {
    id: "3",
    author: {
      username: "cityexplorer",
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    timestamp: "6h ago",
    contentType: "image" as const,
    content: {
      imageUrl: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=400&fit=crop",
    },
    stats: { comments: 18, likes: 267, reblogs: 34 },
    interactions: { hasCommented: false, hasLiked: false, hasReblogged: false },
  },
  {
    id: "4",
    author: {
      username: "midnight_thoughts",
      avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    timestamp: "8h ago",
    contentType: "text" as const,
    content: {
      text: "Hot take: The internet was better when it was weird and everyone had a personal blog with a terrible color scheme and an auto-playing MIDI soundtrack.\n\nI miss the chaos. I miss the authenticity. I miss when we made things just because we wanted to, not because of The Algorithm.",
    },
    stats: { comments: 234, likes: 1823, reblogs: 567 },
    interactions: { hasCommented: false, hasLiked: true, hasReblogged: true },
  },
  {
    id: "5",
    author: {
      username: "foodie_adventures",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    timestamp: "12h ago",
    contentType: "image" as const,
    content: {
      imageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop",
    },
    stats: { comments: 45, likes: 512, reblogs: 89 },
    interactions: { hasCommented: false, hasLiked: false, hasReblogged: false },
    isSensitive: false,
  },
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<FeedTab>("chronological");
  const [posts, setPosts] = useState(demoPosts);
  const [isLoading] = useState(false);

  const handleLike = (postId: string) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const wasLiked = post.interactions.hasLiked;
          return {
            ...post,
            stats: {
              ...post.stats,
              likes: wasLiked ? post.stats.likes - 1 : post.stats.likes + 1,
            },
            interactions: {
              ...post.interactions,
              hasLiked: !wasLiked,
            },
          };
        }
        return post;
      })
    );
  };

  const handleComment = (postId: string) => {
    console.log("Open comments for", postId);
    // TODO: Open comment modal/drawer
  };

  const handleReblog = (
    postId: string,
    type: "instant" | "with-comment" | "schedule" | "queue"
  ) => {
    console.log("Reblog", postId, "with type", type);
    // TODO: Handle reblog based on type
    alert(`Reblog type: ${type}\n\nThis will be implemented in Phase 4.`);
  };

  // Sort posts based on active tab
  const sortedPosts = [...posts].sort((a, b) => {
    if (activeTab === "engagement") {
      // Sort by engagement score (likes + comments*2 + reblogs*3)
      const scoreA = a.stats.likes + a.stats.comments * 2 + a.stats.reblogs * 3;
      const scoreB = b.stats.likes + b.stats.comments * 2 + b.stats.reblogs * 3;
      return scoreB - scoreA;
    }
    // Chronological - keep original order (which is chronological in demo)
    return 0;
  });

  return (
    <div className="py-6">
      <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <FeedList
        posts={sortedPosts}
        isLoading={isLoading}
        onLike={handleLike}
        onComment={handleComment}
        onReblog={handleReblog}
      />
    </div>
  );
}
