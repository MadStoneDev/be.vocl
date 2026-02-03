"use client";

import { useState, useCallback, useTransition } from "react";
import { toggleLike, getLikesByPost } from "@/actions/likes";

interface UserData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role?: number;
}

interface UseLikeOptions {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
  initialLikedBy?: UserData[];
}

interface UseLikeReturn {
  isLiked: boolean;
  likeCount: number;
  likedBy: UserData[];
  isPending: boolean;
  handleLike: () => void;
  refreshLikes: () => Promise<void>;
}

export function useLike({
  postId,
  initialLiked = false,
  initialCount = 0,
  initialLikedBy = [],
}: UseLikeOptions): UseLikeReturn {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [likedBy, setLikedBy] = useState<UserData[]>(initialLikedBy);
  const [isPending, startTransition] = useTransition();

  const handleLike = useCallback(() => {
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    startTransition(async () => {
      const result = await toggleLike(postId);

      if (!result.success) {
        // Revert optimistic update on failure
        setIsLiked(wasLiked);
        setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
        console.error("Like failed:", result.error);
      } else {
        // Sync with server response
        if (result.liked !== undefined) {
          setIsLiked(result.liked);
        }
      }
    });
  }, [postId, isLiked]);

  const refreshLikes = useCallback(async () => {
    const result = await getLikesByPost(postId);
    if (result.success && result.likes) {
      setLikedBy(
        result.likes.map((like) => ({
          id: like.id,
          username: like.username,
          displayName: like.displayName,
          avatarUrl: like.avatarUrl,
          role: like.role,
        }))
      );
      setLikeCount(result.count || 0);
      if (result.hasLiked !== undefined) {
        setIsLiked(result.hasLiked);
      }
    }
  }, [postId]);

  return {
    isLiked,
    likeCount,
    likedBy,
    isPending,
    handleLike,
    refreshLikes,
  };
}
