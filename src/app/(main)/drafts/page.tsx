"use client";

import { useEffect, useState, useCallback } from "react";
import {
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconLayoutGrid,
  IconChartBar,
  IconQuestionMark,
  IconClock,
  IconCalendarEvent,
  IconList,
  IconSend,
  IconTrash,
  IconEdit,
} from "@tabler/icons-react";
import Link from "next/link";
import {
  getDrafts,
  getScheduledPosts,
  getQueuedPosts,
  deleteDraft,
  publishDraft,
} from "@/actions/drafts";
import { toast, LoadingSpinner, ConfirmDialog } from "@/components/ui";

type Tab = "drafts" | "scheduled" | "queue";

const postTypeIcons: Record<string, typeof IconFileText> = {
  text: IconFileText,
  image: IconPhoto,
  video: IconVideo,
  audio: IconMusic,
  gallery: IconLayoutGrid,
  poll: IconChartBar,
  ask: IconQuestionMark,
};

const postTypeLabels: Record<string, string> = {
  text: "Text post",
  image: "Image post",
  video: "Video post",
  audio: "Audio post",
  gallery: "Gallery post",
  poll: "Poll",
  ask: "Ask",
};

function getContentPreview(postType: string, content: any): string {
  if (!content) return postTypeLabels[postType] || "Post";

  if (postType === "text" && content.plain) {
    return content.plain.length > 100
      ? content.plain.slice(0, 100) + "..."
      : content.plain;
  }

  if (postType === "text" && content.html) {
    const stripped = content.html.replace(/<[^>]*>/g, "");
    return stripped.length > 100 ? stripped.slice(0, 100) + "..." : stripped;
  }

  if (postType === "ask" && content.question) {
    return content.question.length > 100
      ? content.question.slice(0, 100) + "..."
      : content.question;
  }

  if (postType === "poll" && content.question) {
    return content.question.length > 100
      ? content.question.slice(0, 100) + "..."
      : content.question;
  }

  return postTypeLabels[postType] || "Post";
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatScheduledDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DraftsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("drafts");
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const tabs = [
    { id: "drafts" as const, label: "Under review", icon: IconFileText },
    { id: "scheduled" as const, label: "Scheduled", icon: IconCalendarEvent },
    { id: "queue" as const, label: "Queue", icon: IconList },
  ];

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let result;

    switch (activeTab) {
      case "drafts":
        result = await getDrafts();
        break;
      case "scheduled":
        result = await getScheduledPosts();
        break;
      case "queue":
        result = await getQueuedPosts();
        break;
    }

    if (result.success) {
      setPosts(result.posts || []);
    } else {
      toast.error(result.error || "Failed to load posts");
    }

    setLoading(false);
  }, [activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handlePublish = async (postId: string) => {
    setActionLoading(postId);
    const result = await publishDraft(postId);

    if (result.success) {
      toast.success("Post published!");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      toast.error(result.error || "Failed to publish");
    }

    setActionLoading(null);
  };

  const handleDelete = async (postId: string) => {
    setActionLoading(postId);
    const result = await deleteDraft(postId);

    if (result.success) {
      toast.success("Draft deleted");
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } else {
      toast.error(result.error || "Failed to delete");
    }

    setActionLoading(null);
    setConfirmDelete(null);
  };

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <title>Drafts | be.vocl</title>
      <header className="mb-6 border-b border-rule pb-5">
        <p className="kicker kicker-accent">The spike</p>
        <h1 className="type-display text-ink mt-2">Unpublished posts</h1>
      </header>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-rule overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              data-active={isActive}
              className="section-tab whitespace-nowrap hover:text-ink transition-colors"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : posts.length === 0 ? (
        <div className="border-y border-rule py-16 px-4 text-center">
          <p className="kicker kicker-accent mb-3">Nothing here</p>
          <h3 className="type-display text-ink">
            {activeTab === "drafts" && "Nothing under review."}
            {activeTab === "scheduled" && "No scheduled posts."}
            {activeTab === "queue" && "No queued posts."}
          </h3>
          <p className="editorial-body text-meta mt-3 mx-auto max-w-[48ch]">
            {activeTab === "drafts" && "Posts held for moderation review appear here. They publish automatically once approved."}
            {activeTab === "scheduled" && "Schedule posts to be published at a specific time."}
            {activeTab === "queue" && "Add posts to your queue to publish them in order."}
          </p>
        </div>
      ) : (
        <div className="border-t border-rule">
          {posts.map((post) => {
            const Icon = postTypeIcons[post.post_type] || IconFileText;
            const preview = getContentPreview(post.post_type, post.content);
            const isActioning = actionLoading === post.id;

            return (
              <div
                key={post.id}
                className="flex items-start gap-4 py-4 border-b border-rule hover:bg-vocl-hover transition-colors"
              >
                {/* Post type icon */}
                <div className="w-6 flex justify-center shrink-0 pt-0.5">
                  <Icon className="w-5 h-5 text-meta" aria-hidden="true" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="editorial-body text-ink line-clamp-2">
                    {preview}
                  </p>

                  <div className="flex items-center gap-3 mt-2 slug text-meta-dim">
                    {activeTab === "scheduled" && post.scheduled_for && (
                      <span className="flex items-center gap-1 text-vocl-primary">
                        <IconCalendarEvent size={14} />
                        {formatScheduledDate(post.scheduled_for)}
                      </span>
                    )}
                    {activeTab === "queue" && post.queue_position != null && (
                      <span className="flex items-center gap-1 text-vocl-primary">
                        <IconList size={14} />
                        #{post.queue_position}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <IconClock size={14} />
                      {formatDate(post.updated_at || post.created_at)}
                    </span>
                    {post.tags && post.tags.length > 0 && (
                      <span className="text-foreground/30">
                        {post.tags.slice(0, 3).map((t: string) => `#${t}`).join(" ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/create?edit=${post.id}`}
                    className="p-2 text-meta hover:text-foreground hover:bg-vocl-hover-strong transition-colors"
                    title="Edit"
                  >
                    <IconEdit size={18} />
                  </Link>

                  {/* "Publish now" only applies to scheduled/queued posts. Items in
                      the "Under review" tab are moderation-held and cannot be
                      self-published. */}
                  {activeTab !== "drafts" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(post.id)}
                      disabled={isActioning}
                      className="p-2 text-meta hover:text-vocl-primary hover:bg-vocl-primary/10 transition-colors disabled:opacity-50"
                      title="Publish now"
                    >
                      <IconSend size={18} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirmDelete(post.id)}
                    disabled={isActioning}
                    className="p-2 text-meta hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
        title="Delete draft?"
        message="This action cannot be undone. The draft will be permanently removed."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={actionLoading !== null}
      />
    </div>
  );
}
