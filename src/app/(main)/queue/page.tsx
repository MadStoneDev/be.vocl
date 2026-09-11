"use client";

import { useState, useEffect, useCallback } from "react";
import { IconLoader2, IconRefresh } from "@tabler/icons-react";
import { QueueControls, QueueList, QueueCalendar, QueueItem } from "@/components/queue";
import {
  getQueue,
  getQueueSettings,
  reorderQueue,
  removeFromQueue,
  publishNow,
  updateQueueSettings,
} from "@/actions/reblogs";
import { getScheduledPosts, publishDraft, deleteDraft } from "@/actions/drafts";

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
  postType: string;
  content: any;
  isSensitive: boolean;
  createdAt: string;
  reblogCommentHtml?: string;
  originalPost?: {
    id: string;
    postType: string;
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
        const transformedPosts: QueuePost[] = queueResult.posts.map((post: any) => ({
          id: post.id,
          queuePosition: post.queue_position || 0,
          postType: post.post_type,
          content: post.content,
          isSensitive: post.is_sensitive,
          createdAt: post.created_at,
          reblogCommentHtml: post.reblog_comment_html,
          originalPost: post.original_post
            ? {
                id: post.original_post.id,
                postType: post.original_post.post_type,
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

  // Scheduled-post actions (fixed date/time posts, managed separately from the queue)
  const handleScheduledPublish = async (postId: string) => {
    const result = await publishDraft(postId);
    if (result.success) {
      setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  const handleScheduledDelete = async (postId: string) => {
    const result = await deleteDraft(postId);
    if (result.success) {
      setScheduledPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  };

  // Handle settings update
  const handleUpdateSettings = async (newSettings: Partial<QueueSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    await updateQueueSettings(newSettings);
  };

  return (
    <div className={`mx-auto px-4 py-6 ${viewMode === "calendar" ? "max-w-5xl" : "max-w-2xl"}`}>
      <title>Queue | be.vocl</title>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <p className="kicker kicker-accent mb-2.5">
            {viewMode === "calendar" ? "The schedule" : "The spike"}
          </p>
          <h1 className="font-display text-4xl leading-none text-ink">Queue</h1>
          <p className="font-serif italic text-base text-meta mt-2">
            {viewMode === "calendar"
              ? "Scheduled posts hold an exact time. Queued posts auto-spread across your daily slots."
              : "Manage your scheduled posts."}
          </p>
        </div>

        {/* View toggle — text tabs with the accent underline */}
        <div className="flex items-center gap-5 flex-shrink-0 pb-1">
          <button
            type="button"
            onClick={() => setViewMode("list")}
            data-active={viewMode === "list"}
            className="section-tab hover:text-ink transition-colors"
          >
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode("calendar")}
            data-active={viewMode === "calendar"}
            className="section-tab hover:text-ink transition-colors"
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6">
        <QueueControls
          settings={settings}
          queueCount={posts.length}
          loading={isLoading}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 border border-vocl-like/40 text-vocl-like flex items-center justify-between gap-3">
          <span className="type-body">{error}</span>
          <button
            onClick={fetchQueue}
            className="inline-flex items-center gap-1.5 slug text-vocl-like hover:text-ink transition-colors shrink-0"
          >
            <IconRefresh size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-accent" />
        </div>
      ) : viewMode === "calendar" ? (
        <QueueCalendar
          posts={posts}
          scheduledPosts={scheduledPosts}
          settings={settings}
        />
      ) : (
        /* List view: the auto-slotted queue, then any fixed-time scheduled posts */
        <div className="space-y-10">
          <section>
            {scheduledPosts.length > 0 && (
              <div className="mb-4 border-b border-rule pb-3">
                <p className="slug text-meta">Queue</p>
                <p className="font-serif italic text-sm text-meta mt-1">
                  Published automatically into your daily posting window.
                </p>
              </div>
            )}
            <QueueList
              posts={posts}
              settings={settings}
              onReorder={handleReorder}
              onPublishNow={handlePublishNow}
              onRemove={handleRemove}
            />
          </section>

          {scheduledPosts.length > 0 && (
            <section>
              <div className="mb-4 border-b border-rule pb-3">
                <p className="slug text-meta">Scheduled</p>
                <p className="font-serif italic text-sm text-meta mt-1">
                  Set to publish at a specific date &amp; time you picked.
                </p>
              </div>
              <div className="space-y-2">
                {scheduledPosts.map((sp) => (
                  <QueueItem
                    key={sp.id}
                    variant="scheduled"
                    post={{
                      id: sp.id,
                      queuePosition: 0,
                      postType: sp.post_type,
                      content: sp.content,
                      isSensitive: sp.is_sensitive ?? false,
                      createdAt: sp.created_at,
                    }}
                    scheduledFor={new Date(sp.scheduled_for)}
                    onPublishNow={handleScheduledPublish}
                    onRemove={handleScheduledDelete}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
