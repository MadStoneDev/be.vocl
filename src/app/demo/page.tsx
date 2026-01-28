"use client";

import { useState } from "react";
import { Post, ImageContent, TextContent } from "@/components/Post";
import type { PostStats, PostInteractions } from "@/components/Post";

// Demo data
const demoImagePost = {
  id: "post-1",
  author: {
    username: "someusernamewithap",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  timestamp: "posted 1d ago",
  imageUrl: "https://images.unsplash.com/photo-1522383225653-ed111181a951?w=600&h=600&fit=crop",
};

const demoTextPost = {
  id: "post-2",
  author: {
    username: "someusernamewithap",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
  },
  timestamp: "posted 1d ago",
  content: `Everyone is entitled in full equality to a fair and public hearing by an independent and impartial tribunal, in the determination of his rights and obligations and of any criminal charge against him.

No one shall be subjected to arbitrary interference with his privacy, family, home or correspondence, nor to attacks upon his honour and reputation. Everyone has the right to the protection of the law against such interference or attacks.`,
};

export default function DemoPage() {
  // State for image post
  const [imagePostStats, setImagePostStats] = useState<PostStats>({
    comments: 12,
    likes: 365,
    reblogs: 56,
  });
  const [imagePostInteractions, setImagePostInteractions] = useState<PostInteractions>({
    hasCommented: false,
    hasLiked: false,
    hasReblogged: false,
  });

  // State for text post
  const [textPostStats, setTextPostStats] = useState<PostStats>({
    comments: 12,
    likes: 365,
    reblogs: 56,
  });
  const [textPostInteractions, setTextPostInteractions] = useState<PostInteractions>({
    hasCommented: true,
    hasLiked: true,
    hasReblogged: false,
  });

  const handleLike = (
    setStats: React.Dispatch<React.SetStateAction<PostStats>>,
    setInteractions: React.Dispatch<React.SetStateAction<PostInteractions>>,
    currentlyLiked: boolean
  ) => {
    setStats((prev) => ({
      ...prev,
      likes: currentlyLiked ? prev.likes - 1 : prev.likes + 1,
    }));
    setInteractions((prev) => ({
      ...prev,
      hasLiked: !prev.hasLiked,
    }));
  };

  const handleReblog = (type: "instant" | "with-comment" | "schedule" | "queue") => {
    console.log("Reblog type:", type);
    alert(`Reblog action: ${type}\n\nThis will be implemented with server functionality.`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-background px-4 py-12">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl text-foreground">be.vocl</h1>
        <p className="mt-2 font-sans text-sm text-gray-500">Post Component Demo</p>
      </header>

      <main className="flex flex-col gap-8">
        {/* Image Post - Standard state */}
        <Post
          id={demoImagePost.id}
          author={demoImagePost.author}
          timestamp={demoImagePost.timestamp}
          contentType="image"
          stats={imagePostStats}
          interactions={imagePostInteractions}
          onLike={() =>
            handleLike(setImagePostStats, setImagePostInteractions, imagePostInteractions.hasLiked)
          }
          onComment={() => console.log("Open comments")}
          onReblog={handleReblog}
          onMenuClick={() => console.log("Open menu")}
        >
          <ImageContent src={demoImagePost.imageUrl} alt="Cherry blossoms in Tokyo" />
        </Post>

        {/* Text Post - Reacted state */}
        <Post
          id={demoTextPost.id}
          author={demoTextPost.author}
          timestamp={demoTextPost.timestamp}
          contentType="text"
          stats={textPostStats}
          interactions={textPostInteractions}
          onLike={() =>
            handleLike(setTextPostStats, setTextPostInteractions, textPostInteractions.hasLiked)
          }
          onComment={() => console.log("Open comments")}
          onReblog={handleReblog}
          onMenuClick={() => console.log("Open menu")}
        >
          <TextContent>{demoTextPost.content}</TextContent>
        </Post>
      </main>
    </div>
  );
}
