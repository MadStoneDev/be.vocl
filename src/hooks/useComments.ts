"use client";

import { useState, useCallback, useTransition } from "react";
import { createComment, deleteComment, getCommentsByPost } from "@/actions/comments";

interface CommentData {
  id: string;
  authorId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role?: number;
  content: string;
  createdAt: string;
  isOwn: boolean;
}

interface UseCommentsOptions {
  postId: string;
  initialComments?: CommentData[];
  initialHasCommented?: boolean;
}

interface UseCommentsReturn {
  comments: CommentData[];
  commentCount: number;
  hasCommented: boolean;
  isPending: boolean;
  addComment: (content: string) => Promise<boolean>;
  removeComment: (commentId: string) => Promise<boolean>;
  refreshComments: () => Promise<void>;
}

export function useComments({
  postId,
  initialComments = [],
  initialHasCommented = false,
}: UseCommentsOptions): UseCommentsReturn {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [hasCommented, setHasCommented] = useState(initialHasCommented);
  const [isPending, startTransition] = useTransition();

  const addComment = useCallback(
    async (content: string): Promise<boolean> => {
      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await createComment(postId, content);

          if (result.success) {
            // Refresh comments to get the new one with proper data
            await refreshCommentsInternal();
            setHasCommented(true);
            resolve(true);
          } else {
            console.error("Add comment failed:", result.error);
            resolve(false);
          }
        });
      });
    },
    [postId]
  );

  const removeComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      // Optimistic update
      const originalComments = comments;
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      return new Promise((resolve) => {
        startTransition(async () => {
          const result = await deleteComment(commentId);

          if (!result.success) {
            // Revert optimistic update
            setComments(originalComments);
            console.error("Delete comment failed:", result.error);
            resolve(false);
          } else {
            // Check if user still has comments
            const stillHasComments = comments.filter(
              (c) => c.id !== commentId && c.isOwn
            ).length > 0;
            setHasCommented(stillHasComments);
            resolve(true);
          }
        });
      });
    },
    [comments]
  );

  const refreshCommentsInternal = async () => {
    const result = await getCommentsByPost(postId);
    if (result.success && result.comments) {
      setComments(result.comments);
      if (result.hasCommented !== undefined) {
        setHasCommented(result.hasCommented);
      }
    }
  };

  const refreshComments = useCallback(async () => {
    await refreshCommentsInternal();
  }, [postId]);

  return {
    comments,
    commentCount: comments.length,
    hasCommented,
    isPending,
    addComment,
    removeComment,
    refreshComments,
  };
}
