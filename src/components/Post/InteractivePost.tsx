"use client";

import { useState, useCallback, useTransition, type ReactNode } from "react";
import { Post } from "./Post";
import { PostMenu } from "./PostMenu";
import type { PostContentType, PostAuthor, PostStats, PostInteractions, CommentData, UserData } from "./Post";
import { useLike } from "@/hooks/useLike";
import { useComments } from "@/hooks/useComments";
import { useReblog } from "@/hooks/useReblog";
import { ConfirmDialog, toast } from "@/components/ui";
import { deletePost } from "@/actions/posts";
import { reblogPost } from "@/actions/reblogs";
import { pinPost, unpinPost } from "@/actions/profile";
import { muteUser, unfollowUser } from "@/actions/follows";
import { ReblogDialog } from "@/components/reblog";
import { ReportDialog } from "./ReportDialog";
import { UserReportDialog } from "./UserReportDialog";
import { PostTags } from "./PostTags";

interface PostTag {
  id: string;
  name: string;
}

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
  isPinned?: boolean;
  contentPreview?: string;
  imageUrl?: string;
  tags?: PostTag[];
  onEdit?: () => void;
  onDeleted?: () => void;
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
  isPinned = false,
  contentPreview = "",
  imageUrl,
  tags = [],
  onEdit,
  onDeleted,
}: InteractivePostProps) {
  // Menu and dialog state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isDeleted, setIsDeleted] = useState(false);

  // Reblog dialog state
  const [showReblogDialog, setShowReblogDialog] = useState(false);
  const [reblogDialogMode, setReblogDialogMode] = useState<"now" | "queue" | "schedule">("now");
  const [isReblogging, startReblogTransition] = useTransition();

  // Flag/Report dialog state
  const [showFlagDialog, setShowFlagDialog] = useState(false);
  const [showReportUserDialog, setShowReportUserDialog] = useState(false);

  // Pin state (can be toggled)
  const [currentlyPinned, setCurrentlyPinned] = useState(isPinned);
  const [isPinning, startPinTransition] = useTransition();

  // Mute/unfollow state
  const [isMuted, setIsMuted] = useState(false);
  const [isUnfollowed, setIsUnfollowed] = useState(false);
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
  } = useComments({
    postId: id,
    initialHasCommented: initialInteractions.hasCommented,
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

  // Transform comments to match Post component interface
  const comments: CommentData[] = commentsRaw.map((c) => ({
    id: c.id,
    author: {
      username: c.username,
      avatarUrl: c.avatarUrl || "https://via.placeholder.com/100",
      role: c.role,
    },
    content: c.content,
    timestamp: c.createdAt,
  }));

  // Transform likedBy to match Post component interface
  const likedBy: UserData[] = likedByRaw.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl || "https://via.placeholder.com/100",
    displayName: u.displayName || undefined,
    role: u.role,
  }));

  // Transform rebloggedBy to match Post component interface
  const rebloggedBy: UserData[] = rebloggedByRaw.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatarUrl || "https://via.placeholder.com/100",
    displayName: u.displayName || undefined,
    role: u.role,
  }));

  // Build current stats
  const stats: PostStats = {
    comments: commentCount,
    likes: likeCount,
    reblogs: reblogCount,
  };

  // Build current interactions
  const interactions: PostInteractions = {
    hasCommented,
    hasLiked: isLiked,
    hasReblogged,
  };

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
          toast.success("Reblogged!");
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
    toast.success("Reblogged!");
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

  const handleUnfollow = useCallback(() => {
    if (!authorId) {
      toast.error("Unable to unfollow user");
      return;
    }
    startPinTransition(async () => {
      const result = await unfollowUser(authorId);
      if (result.success) {
        setIsUnfollowed(true);
        toast.success(`Unfollowed @${author.username}`);
      } else {
        toast.error(result.error || "Failed to unfollow user");
      }
    });
  }, [authorId, author.username]);

  const handleFlagPost = useCallback(() => {
    setShowFlagDialog(true);
  }, []);

  const handleReportUser = useCallback(() => {
    setShowReportUserDialog(true);
  }, []);

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
        isSensitive={isSensitive}
        comments={comments}
        likedBy={likedBy}
        rebloggedBy={rebloggedBy}
        onLike={handleLike}
        onComment={handleComment}
        onReblog={handleReblog}
        onMenuClick={handleMenuClick}
        onLikesExpand={refreshLikes}
        onReblogsExpand={refreshRebloggedBy}
      >
        {children}
        {tags.length > 0 && <PostTags tags={tags} />}
      </Post>

      {/* Post Menu */}
      <PostMenu
        postId={id}
        isOpen={isMenuOpen}
        onClose={handleMenuClose}
        isOwn={isOwn}
        isPinned={currentlyPinned}
        authorUsername={author.username}
        onEdit={onEdit}
        onDelete={handleDelete}
        onPin={handlePin}
        onMute={handleMute}
        onUnfollow={handleUnfollow}
        onFlagPost={handleFlagPost}
        onReportUser={handleReportUser}
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
    </div>
  );
}
