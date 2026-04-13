"use client";

import { useState, useCallback, useTransition, useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { Post, TextContent, ImageContent } from "./Post";
import { VideoContent } from "./content/VideoContent";
import { AudioContent } from "./content/AudioContent";
import { GalleryContent } from "./content/GalleryContent";
import { LinkPreviewCarousel } from "./content/LinkPreviewCarousel";
import type { PostContentType, PostAuthor, PostStats, PostInteractions, CommentData, UserData } from "./Post";
import type { VideoEmbedPlatform } from "@/types/database";
import { useLike } from "@/hooks/useLike";
import { useComments } from "@/hooks/useComments";
import { useReblog } from "@/hooks/useReblog";
import { useBookmark } from "@/hooks/useBookmark";
import { ConfirmDialog, toast } from "@/components/ui";
import { deletePost } from "@/actions/posts";
import { reblogPost } from "@/actions/reblogs";
import { pinPost, unpinPost } from "@/actions/profile";
import { muteUser, followUser, unfollowUser } from "@/actions/follows";
import { muteTag } from "@/actions/tags";
import { mutePostNotifications, unmutePostNotifications } from "@/actions/notifications";
import { useAuth } from "@/hooks/useAuth";
import type { PostTag } from "./Post";

// Lazy load heavy dialog components for better initial bundle size
const PostMenu = dynamic(() => import("./PostMenu").then(mod => ({ default: mod.PostMenu })), {
  ssr: false,
});
const ReblogDialog = dynamic(() => import("@/components/reblog").then(mod => ({ default: mod.ReblogDialog })), {
  ssr: false,
});
const ReportDialog = dynamic(() => import("./ReportDialog").then(mod => ({ default: mod.ReportDialog })), {
  ssr: false,
});
const UserReportDialog = dynamic(() => import("./UserReportDialog").then(mod => ({ default: mod.UserReportDialog })), {
  ssr: false,
});
const EditPostModal = dynamic(() => import("./create/EditPostModal").then(mod => ({ default: mod.EditPostModal })), {
  ssr: false,
});
const CreatePostModal = dynamic(() => import("./create/CreatePostModal").then(mod => ({ default: mod.CreatePostModal })), {
  ssr: false,
});

interface InteractivePostProps {
  id: string;
  author: PostAuthor;
  authorId?: string;
  timestamp: string;
  contentType: PostContentType;
  children: ReactNode;
  initialStats: PostStats;
  initialInteractions: PostInteractions;
  isSensitive?: boolean;
  isOwn?: boolean;
  isFollowingAuthor?: boolean;
  isReblog?: boolean;
  reblogCommentHtml?: string | null;
  originalAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  rebloggedFromAuthor?: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    role: number;
  } | null;
  isPinned?: boolean;
  contentPreview?: string;
  imageUrl?: string;
  tags?: PostTag[];
  content?: any; // Raw post content for editing
  initialBookmarked?: boolean;
  onDeleted?: () => void;
  // Thread metadata
  threadId?: string;
  threadPosition?: number;
  threadLength?: number;
}

export function InteractivePost({
  id,
  author,
  authorId,
  timestamp,
  contentType,
  children,
  initialStats,
  initialInteractions,
  isSensitive = false,
  isOwn = false,
  isFollowingAuthor = false,
  isReblog = false,
  reblogCommentHtml,
  originalAuthor,
  rebloggedFromAuthor,
  isPinned = false,
  contentPreview = "",
  imageUrl,
  tags = [],
  content,
  initialBookmarked = false,
  onDeleted,
  threadId,
  threadPosition,
  threadLength,
}: InteractivePostProps) {
  // User content settings - own posts always auto-reveal, otherwise check user preferences
  const { profile } = useAuth();
  const autoRevealSensitive = isOwn || (profile?.blurSensitiveByDefault === false);

  // Menu and dialog state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isDeleted, setIsDeleted] = useState(false);

  // Edit dialog state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [currentIsSensitive, setCurrentIsSensitive] = useState(isSensitive);
  const [currentTags, setCurrentTags] = useState(tags);
  const [currentContent, setCurrentContent] = useState(content);
  const [currentReblogComment, setCurrentReblogComment] = useState(reblogCommentHtml);

  // Reblog dialog state
  const [showReblogDialog, setShowReblogDialog] = useState(false);
  const [reblogDialogMode, setReblogDialogMode] = useState<"now" | "queue" | "schedule">("now");
  const [isReblogging, startReblogTransition] = useTransition();

  // Flag/Report dialog state
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showReportUserDialog, setShowReportUserDialog] = useState(false);

  // Thread continuation state
  const [showCreateForThread, setShowCreateForThread] = useState(false);

  // Pin state (can be toggled)
  const [currentlyPinned, setCurrentlyPinned] = useState(isPinned);
  const [isPinning, startPinTransition] = useTransition();

  // Mute/follow state
  const [isMuted, setIsMuted] = useState(false);
  const [currentlyFollowing, setCurrentlyFollowing] = useState(isFollowingAuthor);

  // Notification mute state
  const [isNotificationMuted, setIsNotificationMuted] = useState(false);

  // Panel loading states
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [isLikesLoading, setIsLikesLoading] = useState(false);
  const [isReblogsLoading, setIsReblogsLoading] = useState(false);
  // Use likes hook
  const {
    isLiked,
    likeCount,
    likedBy: likedByRaw,
    handleLike,
    refreshLikes,
  } = useLike({
    postId: id,
    initialLiked: initialInteractions.hasLiked,
    initialCount: initialStats.likes,
  });

  // Use comments hook
  const {
    comments: commentsRaw,
    commentCount,
    hasCommented,
    addComment,
    refreshComments,
  } = useComments({
    postId: id,
    initialCount: initialStats.comments,
    initialHasCommented: initialInteractions.hasCommented,
  });

  // Use bookmark hook
  const {
    isBookmarked,
    handleBookmark,
  } = useBookmark({
    postId: id,
    initialBookmarked,
  });

  // Use reblog hook
  const {
    hasReblogged,
    reblogCount,
    rebloggedBy: rebloggedByRaw,
    setHasReblogged,
    setReblogCount,
    refreshRebloggedBy,
  } = useReblog({
    postId: id,
    initialHasReblogged: initialInteractions.hasReblogged,
    initialCount: initialStats.reblogs,
  });

  // Memoize transformations to avoid recalculating on every render
  const comments: CommentData[] = useMemo(() => commentsRaw.map((c) => ({
    id: c.id,
    author: {
      username: c.username,
      avatarUrl: c.avatarUrl || "",
      role: c.role,
    },
    content: c.content,
    timestamp: c.createdAt,
  })), [commentsRaw]);

  const likedBy: UserData[] = useMemo(() => likedByRaw.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl || "",
    displayName: u.displayName || undefined,
    role: u.role,
  })), [likedByRaw]);

  const rebloggedBy: UserData[] = useMemo(() => rebloggedByRaw.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl || "",
    displayName: u.displayName || undefined,
    role: u.role,
  })), [rebloggedByRaw]);

  // Memoize stats and interactions objects
  const stats: PostStats = useMemo(() => ({
    comments: commentCount,
    likes: likeCount,
    reblogs: reblogCount,
  }), [commentCount, likeCount, reblogCount]);

  const interactions: PostInteractions = useMemo(() => ({
    hasCommented,
    hasLiked: isLiked,
    hasReblogged,
  }), [hasCommented, isLiked, hasReblogged]);

  // Handle share
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/post/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch {
        // User cancelled or share failed, fall back to clipboard
        await navigator.clipboard.writeText(url);
        toast.success("Link copied!");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    }
  }, [id]);

  // Handle comment submission
  const handleComment = useCallback(async (content: string) => {
    await addComment(content);
  }, [addComment]);

  // Handle reblog action from radial menu
  const handleReblog = useCallback((type: "instant" | "with-comment" | "schedule" | "queue") => {
    if (type === "instant") {
      // Instant reblog without dialog
      startReblogTransition(async () => {
        const result = await reblogPost(id, "instant");
        if (result.success) {
          setHasReblogged(true);
          setReblogCount((prev) => prev + 1);
          toast.success("Echoed!");
        } else {
          toast.error(result.error || "Failed to reblog");
        }
      });
    } else {
      // Open dialog for other modes
      const modeMap = {
        "with-comment": "now" as const,
        "schedule": "schedule" as const,
        "queue": "queue" as const,
      };
      setReblogDialogMode(modeMap[type]);
      setShowReblogDialog(true);
    }
  }, [id]);

  // Handle successful reblog from dialog
  const handleReblogSuccess = useCallback(() => {
    setHasReblogged(true);
    setReblogCount((prev) => prev + 1);
    toast.success("Echoed!");
  }, []);

  // Menu handlers
  const handleMenuClick = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleDelete = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    startDeleteTransition(async () => {
      const result = await deletePost(id);
      if (result.success) {
        setIsDeleted(true);
        setShowDeleteConfirm(false);
        toast.success("Post deleted");
        onDeleted?.();
      } else {
        toast.error(result.error || "Failed to delete post");
      }
    });
  }, [id, onDeleted]);

  const handlePin = useCallback(() => {
    startPinTransition(async () => {
      if (currentlyPinned) {
        const result = await unpinPost(id);
        if (result.success) {
          setCurrentlyPinned(false);
          toast.success("Post unpinned from profile");
        } else {
          toast.error(result.error || "Failed to unpin post");
        }
      } else {
        const result = await pinPost(id);
        if (result.success) {
          setCurrentlyPinned(true);
          toast.success("Post pinned to profile");
        } else {
          toast.error(result.error || "Failed to pin post");
        }
      }
    });
  }, [id, currentlyPinned]);

  const handleMute = useCallback(() => {
    if (!authorId) {
      toast.error("Unable to mute user");
      return;
    }
    startPinTransition(async () => {
      const result = await muteUser(authorId);
      if (result.success) {
        setIsMuted(true);
        toast.success(`Muted @${author.username}`);
      } else {
        toast.error(result.error || "Failed to mute user");
      }
    });
  }, [authorId, author.username]);

  const handleMuteTag = useCallback((tagId: string, tagName: string) => {
    startPinTransition(async () => {
      const result = await muteTag(tagId);
      if (result.success) {
        toast.success(`Muted #${tagName}`);
      } else {
        toast.error(result.error || "Failed to mute tag");
      }
    });
  }, []);

  const handleFollowToggle = useCallback(() => {
    if (!authorId) {
      toast.error("Unable to update follow status");
      return;
    }
    startPinTransition(async () => {
      if (currentlyFollowing) {
        const result = await unfollowUser(authorId);
        if (result.success) {
          setCurrentlyFollowing(false);
          toast.success(`Unfollowed @${author.username}`);
        } else {
          toast.error(result.error || "Failed to unfollow user");
        }
      } else {
        const result = await followUser(authorId);
        if (result.success) {
          setCurrentlyFollowing(true);
          toast.success(`Following @${author.username}`);
        } else {
          toast.error(result.error || "Failed to follow user");
        }
      }
    });
  }, [authorId, author.username, currentlyFollowing]);

  const handleFlagPost = useCallback(() => {
    setShowFlagDialog(true);
  }, []);

  const handleReportUser = useCallback(() => {
    setShowReportUserDialog(true);
  }, []);

  const handleMuteNotifications = useCallback(() => {
    if (isNotificationMuted) {
      unmutePostNotifications(id).then((r) => {
        if (r.success) {
          setIsNotificationMuted(false);
          toast.success("Notifications unmuted for this post");
        }
      }).catch((error) => {
        console.error("Failed to unmute notifications:", error);
        toast.error("Failed to unmute notifications");
      });
    } else {
      mutePostNotifications(id).then((r) => {
        if (r.success) {
          setIsNotificationMuted(true);
          toast.success("Notifications muted for this post");
        }
      }).catch((error) => {
        console.error("Failed to mute notifications:", error);
        toast.error("Failed to mute notifications");
      });
    }
  }, [id, isNotificationMuted]);

  const handleContinueThread = useCallback(() => {
    setShowCreateForThread(true);
  }, []);

  const handleEdit = useCallback(() => {
    if (isReblog || currentContent) {
      setShowEditDialog(true);
    } else {
      toast.error("Unable to edit this post");
    }
  }, [currentContent, isReblog]);

  const handleEditSuccess = useCallback((updatedData: {
    content: any;
    isSensitive: boolean;
    tags: Array<{ id: string; name: string }>;
  }) => {
    if (isReblog) {
      // For reblogs, the edited content is the reblog caption
      setCurrentReblogComment(updatedData.content?.html || null);
    } else {
      setCurrentContent(updatedData.content);
    }
    setCurrentIsSensitive(updatedData.isSensitive);
    setCurrentTags(updatedData.tags);
    toast.success("Post updated");
  }, [isReblog]);

  // Expand handlers with loading state
  const handleCommentsExpand = useCallback(async () => {
    setIsCommentsLoading(true);
    try {
      await refreshComments();
    } finally {
      setIsCommentsLoading(false);
    }
  }, [refreshComments]);

  const handleLikesExpand = useCallback(async () => {
    setIsLikesLoading(true);
    try {
      await refreshLikes();
    } finally {
      setIsLikesLoading(false);
    }
  }, [refreshLikes]);

  const handleReblogsExpand = useCallback(async () => {
    setIsReblogsLoading(true);
    try {
      await refreshRebloggedBy();
    } finally {
      setIsReblogsLoading(false);
    }
  }, [refreshRebloggedBy]);

  // Render content based on content type and current content data
  const renderContent = useCallback(() => {
    const contentData = currentContent;
    if (!contentData) return children;

    switch (contentType) {
      case "text":
        return (
          <>
            <TextContent html={contentData.html}>
              {contentData.plain || contentData.text}
            </TextContent>
            {contentData.link_previews && contentData.link_previews.length > 0 && (
              <div className="bg-vocl-surface-muted">
                <LinkPreviewCarousel previews={contentData.link_previews} />
              </div>
            )}
          </>
        );

      case "image":
        return (
          <ImageContent
            src={contentData.urls?.[0] || contentData.url || contentData.imageUrl || contentData.imageUrls?.[0]}
            alt="Post image"
            caption={contentData.caption_html || contentData.captionHtml}
          />
        );

      case "gallery":
        return (
          <GalleryContent
            images={contentData.urls || contentData.imageUrls || []}
            caption={contentData.caption_html || contentData.captionHtml}
          />
        );

      case "video":
        return (
          <VideoContent
            src={contentData.url || contentData.videoUrl}
            thumbnailUrl={contentData.thumbnail_url || contentData.videoThumbnailUrl}
            embedUrl={contentData.embed_url || contentData.embedUrl}
            embedPlatform={(contentData.embed_platform || contentData.embedPlatform) as VideoEmbedPlatform}
            caption={contentData.caption_html || contentData.captionHtml}
          />
        );

      case "audio":
        return (
          <AudioContent
            src={contentData.url || contentData.audioUrl}
            albumArtUrl={contentData.album_art_url || contentData.albumArtUrl}
            spotifyData={contentData.spotify_data || contentData.spotifyData}
            caption={contentData.caption_html || contentData.captionHtml}
          />
        );

      default:
        return children;
    }
  }, [currentContent, contentType, children]);

  // Don't render if deleted
  if (isDeleted) {
    return null;
  }

  return (
    <div className="relative">
      <Post
        id={id}
        author={author}
        timestamp={timestamp}
        contentType={contentType}
        stats={stats}
        interactions={interactions}
        isReblog={isReblog}
        reblogCommentHtml={currentReblogComment}
        originalAuthor={originalAuthor}
        rebloggedFromAuthor={rebloggedFromAuthor}
        isSensitive={currentIsSensitive}
        autoRevealSensitive={autoRevealSensitive}
        tags={currentTags}
        comments={comments}
        likedBy={likedBy}
        rebloggedBy={rebloggedBy}
        onLike={handleLike}
        onComment={handleComment}
        onReblog={handleReblog}
        onMenuClick={handleMenuClick}
        onCommentsExpand={handleCommentsExpand}
        onLikesExpand={handleLikesExpand}
        onReblogsExpand={handleReblogsExpand}
        isCommentsLoading={isCommentsLoading}
        isLikesLoading={isLikesLoading}
        isReblogsLoading={isReblogsLoading}
        contentWarning={currentContent?.content_warning}
        threadId={threadId}
        threadPosition={threadPosition}
        threadLength={threadLength}
      >
        {renderContent()}
      </Post>

      {/* Post Menu */}
      <PostMenu
        postId={id}
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        isOwn={isOwn}
        isPinned={currentlyPinned}
        authorUsername={author.username}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        onMute={handleMute}
        isFollowingAuthor={currentlyFollowing}
        onFollowToggle={handleFollowToggle}
        onFlagPost={handleFlagPost}
        onReportUser={handleReportUser}
        isBookmarked={isBookmarked}
        onBookmark={handleBookmark}
        isNotificationMuted={isNotificationMuted}
        onMuteNotifications={handleMuteNotifications}
        onShare={currentIsSensitive ? undefined : handleShare}
        tags={currentTags}
        onMuteTag={handleMuteTag}
        onContinueThread={isOwn ? handleContinueThread : undefined}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Reblog Dialog */}
      <ReblogDialog
        isOpen={showReblogDialog}
        onClose={() => setShowReblogDialog(false)}
        originalPost={{
          id,
          author: {
            username: author.username,
            avatarUrl: author.avatarUrl,
          },
          contentPreview: contentPreview || "No preview available",
          imageUrl,
        }}
        defaultMode={reblogDialogMode}
        onSuccess={handleReblogSuccess}
      />

      {/* Flag Post Dialog */}
      <ReportDialog
        isOpen={showFlagDialog}
        onClose={() => setShowFlagDialog(false)}
        postId={id}
        onSuccess={() => toast.success("Flag submitted. Thank you!")}
      />

      {/* Report User Dialog */}
      {authorId && (
        <UserReportDialog
          isOpen={showReportUserDialog}
          onClose={() => setShowReportUserDialog(false)}
          userId={authorId}
          username={author.username}
          onSuccess={() => toast.success("Report submitted. Thank you!")}
        />
      )}

      {/* Edit Post Dialog */}
      {(currentContent || isReblog) && (
        <EditPostModal
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
          onSuccess={handleEditSuccess}
          isReblogEdit={isReblog}
          post={{
            id,
            postType: isReblog ? "text" : contentType,
            content: isReblog
              ? { html: currentReblogComment || "", plain: "" }
              : currentContent,
            isSensitive: currentIsSensitive,
            tags: currentTags,
          }}
        />
      )}

      {/* Continue Thread Dialog */}
      <CreatePostModal
        isOpen={showCreateForThread}
        onClose={() => setShowCreateForThread(false)}
        threadId={threadId || id}
      />
    </div>
  );
}
