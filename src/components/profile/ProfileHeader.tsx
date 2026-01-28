"use client";

import { useState } from "react";
import Image from "next/image";
import {
  IconUserPlus,
  IconUserMinus,
  IconLoader2,
  IconSettings,
  IconDots,
  IconBan,
  IconVolume3,
  IconShare,
} from "@tabler/icons-react";

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

interface ProfileHeaderProps {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  headerUrl?: string;
  bio?: string;
  stats: ProfileStats;
  isOwnProfile: boolean;
  isFollowing: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onSettings?: () => void;
  onBlock?: () => void;
  onMute?: () => void;
  onShare?: () => void;
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  headerUrl,
  bio,
  stats,
  isOwnProfile,
  isFollowing,
  showFollowers,
  showFollowing,
  onFollow,
  onUnfollow,
  onSettings,
  onBlock,
  onMute,
  onShare,
}: ProfileHeaderProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow?.();
      } else {
        await onFollow?.();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="relative">
      {/* Header/Banner Image */}
      <div className="relative h-32 sm:h-48 w-full overflow-hidden">
        {headerUrl ? (
          <Image
            src={headerUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent/30 via-vocl-accent/10 to-background" />
        )}
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Profile content */}
      <div className="relative px-4 sm:px-6 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          {/* Avatar and info */}
          <div className="flex items-end gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-background shadow-xl">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                    <span className="text-3xl sm:text-4xl font-bold text-white">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              {/* Online indicator - optional */}
              <div className="absolute bottom-1 right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500 border-3 border-background" />
            </div>

            {/* Name and username */}
            <div className="pb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {displayName || username}
              </h1>
              <p className="text-sm sm:text-base text-foreground/50">@{username}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:pb-1">
            {isOwnProfile ? (
              <button
                onClick={onSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-foreground font-medium hover:bg-white/15 transition-colors"
              >
                <IconSettings size={18} />
                <span>Edit profile</span>
              </button>
            ) : (
              <>
                {/* Follow/Unfollow button */}
                <button
                  onClick={handleFollowToggle}
                  disabled={isLoading}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all disabled:opacity-50 ${
                    isFollowing
                      ? "bg-white/10 text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                      : "bg-vocl-accent text-white hover:bg-vocl-accent-hover shadow-lg shadow-vocl-accent/25"
                  }`}
                >
                  {isLoading ? (
                    <IconLoader2 size={18} className="animate-spin" />
                  ) : isFollowing ? (
                    <IconUserMinus size={18} />
                  ) : (
                    <IconUserPlus size={18} />
                  )}
                  <span>{isFollowing ? "Following" : "Follow"}</span>
                </button>

                {/* More options menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2.5 rounded-xl bg-white/10 text-foreground/70 hover:text-foreground hover:bg-white/15 transition-colors"
                  >
                    <IconDots size={20} />
                  </button>

                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 shadow-xl z-50">
                        <button
                          onClick={() => {
                            onShare?.();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <IconShare size={18} />
                          Share profile
                        </button>
                        <button
                          onClick={() => {
                            onMute?.();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                        >
                          <IconVolume3 size={18} />
                          Mute
                        </button>
                        <button
                          onClick={() => {
                            onBlock?.();
                            setShowMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-vocl-like hover:bg-vocl-like/10 transition-colors"
                        >
                          <IconBan size={18} />
                          Block
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bio */}
        {bio && (
          <p className="mt-4 text-foreground/80 text-sm sm:text-base leading-relaxed max-w-xl">
            {bio}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
          <div className="text-center">
            <p className="text-lg sm:text-xl font-bold text-foreground">
              {formatNumber(stats.posts)}
            </p>
            <p className="text-xs sm:text-sm text-foreground/50">Posts</p>
          </div>

          {showFollowers ? (
            <button className="text-center hover:opacity-80 transition-opacity">
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {formatNumber(stats.followers)}
              </p>
              <p className="text-xs sm:text-sm text-foreground/50">Followers</p>
            </button>
          ) : (
            <div className="text-center opacity-50">
              <p className="text-lg sm:text-xl font-bold text-foreground">-</p>
              <p className="text-xs sm:text-sm text-foreground/50">Followers</p>
            </div>
          )}

          {showFollowing ? (
            <button className="text-center hover:opacity-80 transition-opacity">
              <p className="text-lg sm:text-xl font-bold text-foreground">
                {formatNumber(stats.following)}
              </p>
              <p className="text-xs sm:text-sm text-foreground/50">Following</p>
            </button>
          ) : (
            <div className="text-center opacity-50">
              <p className="text-lg sm:text-xl font-bold text-foreground">-</p>
              <p className="text-xs sm:text-sm text-foreground/50">Following</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
