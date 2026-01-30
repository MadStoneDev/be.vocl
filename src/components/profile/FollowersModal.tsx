"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconX, IconLoader2 } from "@tabler/icons-react";
import { FollowButton } from "./FollowButton";
import { getFollowers, getFollowing, followUser, unfollowUser, getFollowStatusBatch } from "@/actions/follows";

type ModalType = "followers" | "following";

interface User {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isFollowing?: boolean;
}

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ModalType;
  userId: string;
  username: string;
  currentUserId?: string;
}

export function FollowersModal({
  isOpen,
  onClose,
  type,
  userId,
  username,
  currentUserId,
}: FollowersModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);

    let userData: any[] = [];
    let totalCount = 0;

    if (type === "followers") {
      const result = await getFollowers(userId, 50);
      if (result.success && result.followers) {
        userData = result.followers;
        totalCount = result.total || 0;
      }
    } else {
      const result = await getFollowing(userId, 50);
      if (result.success && result.following) {
        userData = result.following;
        totalCount = result.total || 0;
      }
    }

    // Get follow status for all users in batch
    const userIds = userData.map((u: any) => u.id);
    const followStatusResult = await getFollowStatusBatch(userIds);
    const followingIds = new Set(followStatusResult.followingIds || []);

    setUsers(
      userData.map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        bio: u.bio,
        isFollowing: followingIds.has(u.id),
      }))
    );
    setTotal(totalCount);

    setIsLoading(false);
  }, [userId, type]);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, fetchUsers]);

  const handleFollow = async (targetUserId: string) => {
    const result = await followUser(targetUserId);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: true } : u))
      );
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    const result = await unfollowUser(targetUserId);
    if (result.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, isFollowing: false } : u))
      );
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-vocl-surface-dark rounded-3xl z-50 flex flex-col max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div>
            <h2 className="font-semibold text-foreground text-lg">
              {type === "followers" ? "Followers" : "Following"}
            </h2>
            <p className="text-foreground/50 text-sm">@{username}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-foreground/50">
                {type === "followers"
                  ? "No followers yet"
                  : "Not following anyone yet"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                >
                  {/* Avatar */}
                  <Link href={`/profile/${user.username}`} onClick={onClose}>
                    <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0">
                      {user.avatarUrl ? (
                        <Image
                          src={user.avatarUrl}
                          alt={user.username}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* User info */}
                  <Link
                    href={`/profile/${user.username}`}
                    onClick={onClose}
                    className="flex-1 min-w-0"
                  >
                    <p className="font-semibold text-foreground truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-sm text-foreground/50 truncate">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-foreground/70 mt-1 line-clamp-2">
                        {user.bio}
                      </p>
                    )}
                  </Link>

                  {/* Follow button (if not own profile) */}
                  {currentUserId && currentUserId !== user.id && (
                    <FollowButton
                      isFollowing={user.isFollowing || false}
                      onFollow={() => handleFollow(user.id)}
                      onUnfollow={() => handleUnfollow(user.id)}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with count */}
        {!isLoading && users.length > 0 && (
          <div className="p-3 border-t border-white/5 text-center">
            <p className="text-foreground/40 text-sm">
              {total} {type === "followers" ? "followers" : "following"}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
