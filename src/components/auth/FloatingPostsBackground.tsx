"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

interface FloatingPost {
  id: number;
  type: "text" | "image";
  content: string;
  author: string;
  imageUrl?: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  speed: number;
  direction: number;
  opacity: number;
}

// Sample SFW posts for the background
const samplePosts = [
  {
    type: "text" as const,
    content: "Just discovered the most amazing coffee shop downtown. The vibes are immaculate.",
    author: "coffeelover",
  },
  {
    type: "image" as const,
    content: "Sunset from my balcony",
    author: "photographer",
    imageUrl: "https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=300&h=200&fit=crop",
  },
  {
    type: "text" as const,
    content: "Hot take: pineapple absolutely belongs on pizza and I will die on this hill.",
    author: "foodie_takes",
  },
  {
    type: "image" as const,
    content: "My cat being dramatic",
    author: "catlady",
    imageUrl: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=200&fit=crop",
  },
  {
    type: "text" as const,
    content: "Currently reading: The midnight library. No spoilers please!",
    author: "bookworm",
  },
  {
    type: "image" as const,
    content: "Morning hike views",
    author: "adventurer",
    imageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=300&h=200&fit=crop",
  },
  {
    type: "text" as const,
    content: "Remember to drink water and take breaks. You're doing great.",
    author: "positivity",
  },
  {
    type: "image" as const,
    content: "Homemade pasta night",
    author: "homechef",
    imageUrl: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=300&h=200&fit=crop",
  },
  {
    type: "text" as const,
    content: "The way autumn light hits different. Pure magic.",
    author: "naturelover",
  },
  {
    type: "image" as const,
    content: "City lights at midnight",
    author: "nightowl",
    imageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=300&h=200&fit=crop",
  },
];

function PostCard({ post }: { post: FloatingPost }) {
  return (
    <div
      className="absolute w-64 rounded-2xl bg-vocl-surface shadow-lg overflow-hidden pointer-events-none"
      style={{
        left: `${post.x}%`,
        top: `${post.y}%`,
        transform: `rotate(${post.rotation}deg) scale(${post.scale})`,
        opacity: post.opacity,
        transition: "transform 0.1s linear, left 0.1s linear, top 0.1s linear",
      }}
    >
      {post.type === "image" && post.imageUrl && (
        <div className="relative w-full h-32">
          <Image
            src={post.imageUrl}
            alt={post.content}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <div className="p-4">
        <p className="text-sm text-gray-800 line-clamp-3">{post.content}</p>
        <p className="text-xs text-gray-500 mt-2">@{post.author}</p>
      </div>
    </div>
  );
}

export function FloatingPostsBackground() {
  const [posts, setPosts] = useState<FloatingPost[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Initialize posts with random positions
  const initialPosts = useMemo(() => {
    return samplePosts.map((sample, index) => ({
      ...sample,
      id: index,
      x: Math.random() * 80 + 10, // 10-90% to keep cards somewhat visible
      y: Math.random() * 80 + 10,
      rotation: Math.random() * 20 - 10, // -10 to 10 degrees
      scale: 0.6 + Math.random() * 0.3, // 0.6 to 0.9
      speed: 0.02 + Math.random() * 0.03, // Slow drift
      direction: Math.random() * Math.PI * 2, // Random direction in radians
      opacity: 0.3 + Math.random() * 0.3, // 0.3 to 0.6
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

          // Bounce off edges
          if (newX < 0 || newX > 90) {
            newDirection = Math.PI - newDirection;
            newX = Math.max(0, Math.min(90, newX));
          }
          if (newY < 0 || newY > 85) {
            newDirection = -newDirection;
            newY = Math.max(0, Math.min(85, newY));
          }

          // Slowly rotate
          const newRotation = post.rotation + (Math.random() - 0.5) * 0.1;

          return {
            ...post,
            x: newX,
            y: newY,
            direction: newDirection,
            rotation: Math.max(-15, Math.min(15, newRotation)),
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
      {/* Gradient overlay for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/70 to-background/90 z-10" />

      {/* Floating posts */}
      <div className="absolute inset-0">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  );
}
