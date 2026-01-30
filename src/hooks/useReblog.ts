"use client";

import { useState, useCallback } from "react";
import { getRebloggedBy } from "@/actions/reblogs";

interface UserData {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface UseReblogOptions {
  postId: string;
  initialHasReblogged?: boolean;
  initialCount?: number;
}

interface UseReblogReturn {
  hasReblogged: boolean;
  reblogCount: number;
  rebloggedBy: UserData[];
  setHasReblogged: (value: boolean) => void;
  setReblogCount: React.Dispatch<React.SetStateAction<number>>;
  refreshRebloggedBy: () => Promise<void>;
}

export function useReblog({
  postId,
  initialHasReblogged = false,
  initialCount = 0,
}: UseReblogOptions): UseReblogReturn {
  const [hasReblogged, setHasReblogged] = useState(initialHasReblogged);
  const [reblogCount, setReblogCount] = useState(initialCount);
  const [rebloggedBy, setRebloggedBy] = useState<UserData[]>([]);

  const refreshRebloggedBy = useCallback(async () => {
    const result = await getRebloggedBy(postId);
    if (result.success && result.users) {
      setRebloggedBy(
        result.users.map((user) => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        }))
      );
      if (result.total !== undefined) {
        setReblogCount(result.total);
      }
    }
  }, [postId]);

  return {
    hasReblogged,
    reblogCount,
    rebloggedBy,
    setHasReblogged,
    setReblogCount,
    refreshRebloggedBy,
  };
}
