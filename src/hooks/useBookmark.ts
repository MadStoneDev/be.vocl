"use client";

import { useState, useCallback, useTransition } from "react";
import { toggleBookmark } from "@/actions/bookmarks";
import { toast } from "@/components/ui";

interface UseBookmarkOptions {
  postId: string;
  initialBookmarked?: boolean;
}

interface UseBookmarkReturn {
  isBookmarked: boolean;
  isPending: boolean;
  handleBookmark: () => void;
}

export function useBookmark({
  postId,
  initialBookmarked = false,
}: UseBookmarkOptions): UseBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const handleBookmark = useCallback(() => {
    // Optimistic update
    const wasBookmarked = isBookmarked;
    setIsBookmarked(!wasBookmarked);

    startTransition(async () => {
      const result = await toggleBookmark(postId);

      if (!result.success) {
        // Revert optimistic update on failure
        setIsBookmarked(wasBookmarked);
        toast.error("Failed to bookmark post");
      } else if (result.bookmarked !== undefined) {
        setIsBookmarked(result.bookmarked);
      }
    });
  }, [postId, isBookmarked]);

  return {
    isBookmarked,
    isPending,
    handleBookmark,
  };
}
