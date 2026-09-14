"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { IconLoader2 } from "@tabler/icons-react";
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
  followsYou?: boolean;
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
        // Seed follow state from the server so already-followed users don't show "Follow"
        setFollowingMap(
          Object.fromEntries(result.users.map((u) => [u.id, u.isFollowing])),
        );
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
    <div className="border-t border-b border-rule py-4 mb-4">
      <div className="flex items-center justify-between pb-3 border-b border-rule">
        <span className="slug text-accent">Rising voices</span>
        <Link
          href="/explore"
          className="slug text-meta-dim hover:text-ink transition-colors"
        >
          See more
        </Link>
      </div>

      <div className="divide-y divide-rule">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 py-3">
            <Link
              href={`/profile/${user.username}`}
              className="relative w-10 h-10 rounded-none overflow-hidden flex-shrink-0 bg-vocl-hover"
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.username}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center font-display text-ink">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>

            <Link href={`/profile/${user.username}`} className="flex-1 min-w-0">
              <p className="text-sm text-ink truncate">
                {user.displayName || user.username}
              </p>
              <div className="flex items-center gap-2">
                <p className="byline text-meta truncate">@{user.username}</p>
                {user.followsYou && (
                  <span className="slug text-meta-dim flex-shrink-0">Follows you</span>
                )}
              </div>
            </Link>

            <button
              onClick={() => handleFollowToggle(user.id)}
              disabled={followLoadingMap[user.id]}
              className={`px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition-colors flex-shrink-0 ${
                followingMap[user.id]
                  ? "border border-rule text-meta hover:text-vocl-like hover:border-vocl-like"
                  : "bg-accent text-white hover:opacity-[0.88]"
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
