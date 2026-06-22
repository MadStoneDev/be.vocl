"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, MotionConfig } from "framer-motion";
import {
  IconUserPlus,
  IconUserMinus,
  IconLoader2,
  IconSettings,
  IconDots,
  IconBan,
  IconVolume3,
  IconShare,
  IconCoin,
  IconFlag,
  IconMessageQuestion,
  IconMessage,
} from "@tabler/icons-react";
import { VerificationBadge } from "@/components/payments";
import { StaffBadge } from "@/components/ui/StaffBadge";
import { MutualBadge } from "@/components/ui/MutualBadge";
import { fadeUp, tapScale, spring } from "@/lib/motion";

type StatKey = "posts" | "followers" | "following";

interface ProfileHeaderProps {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  headerUrl?: string;
  bio?: string;
  isOwnProfile: boolean;
  isFollowing: boolean;
  isVerified?: boolean;
  isMutual?: boolean;
  role?: number;
  allowsAsks?: boolean;
  stats?: { posts: number; followers: number; following: number };
  onStatClick?: (stat: StatKey) => void;
  onFollow?: () => Promise<void>;
  onUnfollow?: () => Promise<void>;
  onSettings?: () => void;
  onBlock?: () => void;
  onMute?: () => void;
  onShare?: () => void;
  onTip?: () => void;
  onAsk?: () => void;
  onMessage?: () => void | Promise<void>;
  onReport?: () => void;
  onAvatarClick?: () => void;
}

function formatCount(num: number): string {
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
}

export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
  headerUrl,
  bio,
  isOwnProfile,
  isFollowing,
  isVerified,
  isMutual: isMutualProp,
  role = 0,
  allowsAsks,
  stats,
  onStatClick,
  onFollow,
  onUnfollow,
  onSettings,
  onBlock,
  onMute,
  onShare,
  onTip,
  onAsk,
  onMessage,
  onReport,
  onAvatarClick,
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

  const statItems: { key: StatKey; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "followers", label: "Followers" },
    { key: "following", label: "Following" },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="relative"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        {/* Header/Banner Image — taller editorial hero */}
        <div className="relative h-56 md:h-72 w-full overflow-hidden">
          {headerUrl ? (
            <Image
              src={headerUrl}
              alt=""
              fill
              className="object-cover"
              priority
            />
          ) : (
            // Tasteful gradient fallback when there's no custom banner
            <div className="absolute inset-0 bg-gradient-to-br from-vocl-accent/30 via-vocl-primary/10 to-background" />
          )}
          {/* Thin bottom scrim only — keeps custom banners vivid while keeping
              the avatar/name legible where they overlap. */}
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
        </div>

        {/* Profile content */}
        <div className="relative px-4 sm:px-6 -mt-16 sm:-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            {/* Avatar and info */}
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="relative">
                <button
                  onClick={onAvatarClick}
                  className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-background shadow-xl cursor-pointer hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-vocl-primary focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="View profile picture"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary to-vocl-primary-hover flex items-center justify-center">
                      <span className="text-3xl sm:text-4xl font-bold text-white">
                        {username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </button>
                {/* Presence indicator intentionally removed — we don't track
                    real-time presence yet, so showing an always-green dot
                    would misrepresent the user's status. */}
              </div>

              {/* Name and username — editorial masthead */}
              <div className="pb-1">
                <h1 className="type-display-lg text-foreground flex items-center gap-2 flex-wrap">
                  {displayName || username}
                  {isVerified && <VerificationBadge size={22} />}
                  <StaffBadge role={role} size={22} />
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm sm:text-base text-foreground/50">@{username}</p>
                  {isMutualProp && <MutualBadge />}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:pb-1">
              {isOwnProfile ? (
                <motion.button
                  whileTap={tapScale}
                  onClick={onSettings}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-sm bg-vocl-hover-strong text-foreground font-medium hover:bg-vocl-hover transition-colors"
                >
                  <IconSettings size={18} />
                  <span>Edit profile</span>
                </motion.button>
              ) : (
                <>
                  {/* Follow/Unfollow button */}
                  <motion.button
                    whileTap={tapScale}
                    transition={spring}
                    onClick={handleFollowToggle}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-sm font-semibold transition-all disabled:opacity-50 ${
                      isFollowing
                        ? "bg-vocl-hover-strong text-foreground hover:bg-vocl-like/20 hover:text-vocl-like"
                        : "bg-vocl-primary text-white hover:bg-vocl-primary-hover shadow-lg shadow-vocl-primary/25"
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
                  </motion.button>

                  {/* Tip button */}
                  {onTip && (
                    <motion.button
                      whileTap={tapScale}
                      onClick={onTip}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-gradient-to-r from-yellow-500/10 to-orange-500/10 text-yellow-500 font-medium hover:from-yellow-500/20 hover:to-orange-500/20 transition-all border border-yellow-500/20"
                      title="Send a tip"
                    >
                      <IconCoin size={18} />
                      <span>Tip</span>
                    </motion.button>
                  )}

                  {/* Ask button */}
                  {allowsAsks && onAsk && (
                    <motion.button
                      whileTap={tapScale}
                      onClick={onAsk}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-vocl-hover-strong text-foreground font-medium hover:bg-vocl-hover transition-colors"
                      title="Send an ask"
                    >
                      <IconMessageQuestion size={18} />
                      <span className="hidden sm:inline">Ask</span>
                    </motion.button>
                  )}

                  {/* More options menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2.5 rounded-sm bg-vocl-hover-strong text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                    >
                      <IconDots size={20} />
                    </button>

                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-[110]"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 py-2 rounded-sm bg-background border border-vocl-border shadow-xl z-[120]">
                          {onMessage && (
                            <button
                              onClick={() => {
                                onMessage();
                                setShowMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                            >
                              <IconMessage size={18} />
                              Message
                            </button>
                          )}
                          <button
                            onClick={() => {
                              onShare?.();
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                          >
                            <IconShare size={18} />
                            Share profile
                          </button>
                          <button
                            onClick={() => {
                              onMute?.();
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                          >
                            <IconVolume3 size={18} />
                            Mute
                          </button>
                          <button
                            onClick={() => {
                              onReport?.();
                              setShowMenu(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-vocl-hover transition-colors"
                          >
                            <IconFlag size={18} />
                            Report
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

          {/* Bio — confident body type / standfirst */}
          {bio && (
            <p className="mt-4 type-body text-foreground/90 max-w-xl">
              {bio}
            </p>
          )}

          {/* "By the numbers" — ruled editorial stat bar */}
          {stats && (
            <div className="mt-5 flex items-stretch border-y border-vocl-border divide-x divide-vocl-border">
              {statItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onStatClick?.(item.key)}
                  className="group flex flex-1 flex-col items-center py-3 transition-colors hover:bg-vocl-hover"
                >
                  <span className="type-heading text-foreground tabular-nums group-hover:text-vocl-primary transition-colors">
                    {formatCount(stats[item.key])}
                  </span>
                  <span className="type-meta uppercase tracking-widest text-foreground/50 mt-0.5">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Masthead closing rule */}
          <div className="mt-5 border-b-4 border-double border-vocl-border" />
        </div>
      </motion.div>
    </MotionConfig>
  );
}
