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
  joinedYear?: number;
  location?: string;
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
  joinedYear,
  location,
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
    { key: "followers", label: "Subscribers" },
    { key: "following", label: "Following" },
  ];

  const eyebrow = joinedYear ? `Columnist since ${joinedYear}` : "Columnist";

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="relative"
        variants={fadeUp}
        initial="hidden"
        animate="show"
      >
        {/* Banner — always present, a 6:1 editorial strip; real image if the
            member has one, otherwise the striped placeholder. */}
        <div className="relative w-full aspect-[6/1] overflow-hidden border-b border-rule ph-image">
          {headerUrl && (
            <Image
              src={headerUrl}
              alt=""
              fill
              sizes="100vw"
              quality={85}
              className="object-cover"
              priority
            />
          )}
        </div>

        {/* Masthead */}
        <div className="relative px-4 sm:px-6 pt-6">
          {/* Eyebrow / kicker */}
          <span className="kicker kicker-accent">{eyebrow}</span>
          <div className="mt-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {/* Portrait and info */}
            <div className="flex items-center gap-4">
              {/* Portrait — circular, consistent with the Avatar used across the app */}
              <div className="relative">
                <button
                  onClick={onAvatarClick}
                  className="relative w-20 h-20 sm:w-28 sm:h-28 shrink-0 rounded-full overflow-hidden border border-vocl-border cursor-pointer hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="View profile picture"
                >
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      fill
                      sizes="(max-width: 640px) 80px, 112px"
                      quality={90}
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 bg-panel flex items-center justify-center">
                      <span className="font-display text-3xl sm:text-4xl text-ink">
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
                <h1 className="font-display text-4xl sm:text-[3.25rem] leading-none tracking-[-0.01em] text-foreground flex items-center gap-2 flex-wrap">
                  {displayName || username}
                  {isVerified && <VerificationBadge size={22} />}
                  <StaffBadge role={role} size={22} />
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="byline text-meta">
                    @{username}
                    {location && <span className="text-meta"> · {location}</span>}
                  </p>
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
                  className="flex items-center gap-2 px-5 py-2.5 border border-foreground text-foreground font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
                >
                  <IconSettings size={16} />
                  <span>Edit profile</span>
                </motion.button>
              ) : (
                <>
                  {/* Follow/Unfollow — the single accent action (outline once following) */}
                  <motion.button
                    whileTap={tapScale}
                    transition={spring}
                    onClick={handleFollowToggle}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-5 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs transition-opacity disabled:opacity-50 ${
                      isFollowing
                        ? "border border-foreground text-foreground hover:bg-vocl-hover"
                        : "bg-accent text-white hover:opacity-[0.88]"
                    }`}
                  >
                    {isLoading ? (
                      <IconLoader2 size={16} className="animate-spin" />
                    ) : isFollowing ? (
                      <IconUserMinus size={16} />
                    ) : (
                      <IconUserPlus size={16} />
                    )}
                    <span>{isFollowing ? "Subscribing" : "Subscribe"}</span>
                  </motion.button>

                  {/* Tip button — outline (no gradient) */}
                  {onTip && (
                    <motion.button
                      whileTap={tapScale}
                      onClick={onTip}
                      className="flex items-center gap-2 px-4 py-2.5 border border-vocl-border text-meta font-sans font-medium uppercase tracking-[0.16em] text-xs hover:text-ink hover:bg-vocl-hover transition-colors"
                      title="Send a tip"
                    >
                      <IconCoin size={16} />
                      <span>Tip</span>
                    </motion.button>
                  )}

                  {/* Ask button — outline */}
                  {allowsAsks && onAsk && (
                    <motion.button
                      whileTap={tapScale}
                      onClick={onAsk}
                      className="flex items-center gap-2 px-4 py-2.5 border border-vocl-border text-meta font-sans font-medium uppercase tracking-[0.16em] text-xs hover:text-ink hover:bg-vocl-hover transition-colors"
                      title="Send an ask"
                    >
                      <IconMessageQuestion size={16} />
                      <span className="hidden sm:inline">Ask</span>
                    </motion.button>
                  )}

                  {/* More options menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="p-2.5 border border-vocl-border text-meta hover:text-ink hover:bg-vocl-hover transition-colors"
                    >
                      <IconDots size={20} />
                    </button>

                    {showMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-[110]"
                          onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 mt-2 w-48 py-2 bg-background border border-vocl-border z-[120]">
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

          {/* Bio — serif standfirst / lead */}
          {bio && <p className="mt-5 editorial-deck max-w-[58ch]">{bio}</p>}

          {/* "By the numbers" — ruled editorial stat bar */}
          {stats && (
            <div className="mt-5 flex items-stretch border-y border-vocl-border divide-x divide-vocl-border">
              {statItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => onStatClick?.(item.key)}
                  className="group flex flex-1 flex-col items-center py-3 transition-colors hover:bg-vocl-hover"
                >
                  <span className="type-heading text-ink tabular-nums group-hover:text-accent transition-colors">
                    {formatCount(stats[item.key])}
                  </span>
                  <span className="byline text-meta mt-1">{item.label}</span>
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
