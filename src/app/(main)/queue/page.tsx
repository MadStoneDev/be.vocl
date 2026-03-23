"use client";

import { useState, useEffect, useCallback } from "react";
import {
  IconClock,
  IconLoader2,
  IconRefresh,
  IconList,
  IconCalendar,
} from "@tabler/icons-react";
import { QueueControls, QueueList, QueueCalendar } from "@/components/queue";
import {
  getQueue,
  getQueueSettings,
  reorderQueue,
  removeFromQueue,
  publishNow,
  updateQueueSettings,
} from "@/actions/reblogs";
import { getScheduledPosts } from "@/actions/drafts";

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

type ViewMode = "list" | "calendar";

export default function QueuePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [posts, setPosts] = useState<QueuePost[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [settings, setSettings] = useState<QueueSettings>({
    enabled: true,
    paused: false,
    postsPerDay: 8,
    windowStart: "09:00",
    windowEnd: "21:00",
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch queue data and settings
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch queue posts, scheduled posts, and settings in parallel
      const [queueResult, settingsResult, scheduledResult] = await Promise.all([
        getQueue(),
        getQueueSettings(),
        getScheduledPosts(),
      ]);

      if (queueResult.success && queueResult.posts) {
        // Transform posts to match QueuePost interface
        const transformedPosts: QueuePost[] = queueResult.posts.map((post: any) => ({
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
        setError(queueResult.error || "Failed to load queue");
      }

      if (settingsResult.success && settingsResult.settings) {
        setSettings(settingsResult.settings);
      }

      if (scheduledResult.success && scheduledResult.posts) {
        setScheduledPosts(scheduledResult.posts);
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
    <div className={`mx-auto px-4 py-6 ${viewMode === "calendar" ? "max-w-5xl" : "max-w-2xl"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
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

        {/* View toggle */}
        <div className="flex items-center rounded-xl bg-vocl-surface-dark border border-white/5 p-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-vocl-accent text-white"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            <IconList size={16} />
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "calendar"
                ? "bg-vocl-accent text-white"
                : "text-foreground/50 hover:text-foreground"
            }`}
          >
            <IconCalendar size={16} />
            Calendar
          </button>
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
        <div className="mb-6 p-4 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={fetchQueue}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-vocl-like/20 hover:bg-vocl-like/30 text-vocl-like text-sm font-medium transition-colors shrink-0"
          >
            <IconRefresh size={16} />
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : viewMode === "calendar" ? (
        <QueueCalendar
          posts={posts}
          scheduledPosts={scheduledPosts}
          settings={settings}
        />
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
