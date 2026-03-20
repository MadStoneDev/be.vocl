"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconUserPlus, IconLoader2 } from "@tabler/icons-react";
import { getSuggestedUsers } from "@/actions/search";
import { followUser, unfollowUser } from "@/actions/follows";
import { toast } from "@/components/ui";

interface SuggestedUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followerCount: number;
  isFollowing: boolean;
}

export function WhoToFollow() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [followLoadingMap, setFollowLoadingMap] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const load = async () => {
      const result = await getSuggestedUsers(3);
      if (result.success && result.users && result.users.length > 0) {
        setUsers(result.users);
      }
      setIsLoading(false);
    };
    load();
  }, []);

  const handleFollowToggle = async (userId: string) => {
    const isCurrentlyFollowing = followingMap[userId] || false;
    setFollowLoadingMap((prev) => ({ ...prev, [userId]: true }));

    const result = isCurrentlyFollowing
      ? await unfollowUser(userId)
      : await followUser(userId);

    if (result.success) {
      setFollowingMap((prev) => ({ ...prev, [userId]: !isCurrentlyFollowing }));
      toast.success(isCurrentlyFollowing ? "Unfollowed" : "Following!");
    } else {
      toast.error("Failed to update follow status");
    }

    setFollowLoadingMap((prev) => ({ ...prev, [userId]: false }));
  };

  // Don't render anything while loading or if no suggestions
  if (isLoading || users.length === 0) return null;

  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IconUserPlus size={18} className="text-vocl-accent" />
          <h3 className="text-sm font-semibold text-foreground">
            Who to Follow
          </h3>
        </div>
        <Link
          href="/explore"
          className="text-xs text-vocl-accent hover:text-vocl-accent-hover transition-colors"
        >
          See more
        </Link>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3"
          >
            <Link
              href={`/profile/${user.username}`}
              className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.username}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </Link>

            <Link
              href={`/profile/${user.username}`}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-medium text-foreground truncate">
                {user.displayName || user.username}
              </p>
              <p className="text-xs text-foreground/50 truncate">
                @{user.username}
              </p>
            </Link>

            <button
              onClick={() => handleFollowToggle(user.id)}
              disabled={followLoadingMap[user.id]}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                followingMap[user.id]
                  ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                  : "bg-vocl-accent text-white hover:bg-vocl-accent-hover"
              }`}
            >
              {followLoadingMap[user.id] ? (
                <IconLoader2 size={14} className="animate-spin" />
              ) : followingMap[user.id] ? (
                "Following"
              ) : (
                "Follow"
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
