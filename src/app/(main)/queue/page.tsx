"use client";

import { useState, useEffect, useCallback } from "react";
import { IconClock, IconLoader2 } from "@tabler/icons-react";
import { QueueControls, QueueList } from "@/components/queue";
import {
  getQueue,
  reorderQueue,
  removeFromQueue,
  publishNow,
  updateQueueSettings,
} from "@/actions/reblogs";

interface QueueSettings {
  enabled: boolean;
  paused: boolean;
  postsPerDay: number;
  windowStart: string;
  windowEnd: string;
}

interface QueuePost {
  id: string;
  queuePosition: number;
  reblogCommentHtml?: string;
  originalPost?: {
    id: string;
    content: any;
    author: {
      username: string;
      avatarUrl?: string;
    };
  };
}

export default function QueuePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [settings, setSettings] = useState<QueueSettings>({
    enabled: true,
    paused: false,
    postsPerDay: 8,
    windowStart: "09:00",
    windowEnd: "21:00",
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch queue data
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getQueue();
      if (result.success && result.posts) {
        // Transform posts to match QueuePost interface
        const transformedPosts: QueuePost[] = result.posts.map((post: any) => ({
          id: post.id,
          queuePosition: post.queue_position || 0,
          reblogCommentHtml: post.reblog_comment_html,
          originalPost: post.original_post
            ? {
                id: post.original_post.id,
                content: post.original_post.content,
                author: {
                  username: post.original_post.profiles?.username || "unknown",
                  avatarUrl: post.original_post.profiles?.avatar_url,
                },
              }
            : undefined,
        }));
        setPosts(transformedPosts);
      } else {
        setError(result.error || "Failed to load queue");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Handle reorder
  const handleReorder = async (postIds: string[]) => {
    // Optimistically update the UI
    const reorderedPosts = postIds.map((id, index) => {
      const post = posts.find((p) => p.id === id)!;
      return { ...post, queuePosition: index + 1 };
    });
    setPosts(reorderedPosts);

    const result = await reorderQueue(postIds);
    if (!result.success) {
      // Revert on error
      fetchQueue();
    }
  };

  // Handle publish now
  const handlePublishNow = async (postId: string) => {
    const result = await publishNow(postId);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // Handle remove
  const handleRemove = async (postId: string) => {
    const result = await removeFromQueue(postId);
    if (result.success) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // Handle settings update
  const handleUpdateSettings = async (newSettings: Partial<QueueSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    await updateQueueSettings(newSettings);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
          <IconClock size={24} className="text-vocl-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Queue</h1>
          <p className="text-sm text-foreground/50">
            Manage your scheduled posts
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <QueueControls
          settings={settings}
          queueCount={posts.length}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : (
        /* Queue list */
        <QueueList
          posts={posts}
          onReorder={handleReorder}
          onPublishNow={handlePublishNow}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
}
