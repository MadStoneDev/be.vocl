"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, MotionConfig } from "framer-motion";
import {
  IconUserMinus,
  IconLoader2,
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

/**
 * Broadsheet profile masthead (artboard 03 — "The Columnist"). The banner is
 * rendered by the page above this; here: kicker → big Gloock name → handle ·
 * location → serif bio → one ruled row carrying the Gloock stat figures AND the
 * Subscribe / Message actions. The section tabs render immediately below (page).
 */
export function ProfileHeader({
  username,
  displayName,
  avatarUrl,
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
      if (isFollowing) await onUnfollow?.();
      else await onFollow?.();
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
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        {/* Kicker */}
        <span className="kicker kicker-accent">{eyebrow}</span>

        {/* Name + portrait */}
        <div className="mt-2 flex items-end gap-4">
          {avatarUrl !== undefined && (
            <button
              onClick={onAvatarClick}
              className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-none border border-rule hover:opacity-95 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="View profile picture"
            >
              {avatarUrl ? (
                <Image src={avatarUrl} alt={username} fill sizes="80px" quality={90} className="object-cover" priority />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-panel">
                  <span className="font-display text-2xl text-ink">{username.charAt(0).toUpperCase()}</span>
                </span>
              )}
            </button>
          )}
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-4xl sm:text-[3.5rem] leading-[1.02] tracking-[-0.01em] text-ink flex items-center gap-2 flex-wrap">
              {displayName || username}
              {isVerified && <VerificationBadge size={22} />}
              <StaffBadge role={role} size={22} />
            </h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="byline text-meta">
                @{username}
                {location && <span> · {location}</span>}
              </span>
              {isMutualProp && <MutualBadge />}
            </div>
          </div>
        </div>

        {/* Bio */}
        {bio && <p className="mt-4 editorial-deck max-w-[58ch]">{bio}</p>}

        {/* Stat figures + primary actions on one ruled row */}
        <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 border-y border-rule py-3.5">
          {stats &&
            statItems.map((item) => (
              <button
                key={item.key}
                onClick={() => onStatClick?.(item.key)}
                className="group inline-flex items-baseline gap-2 transition-colors"
              >
                <span className="font-display text-xl text-ink leading-none group-hover:text-accent transition-colors tabular-nums">
                  {formatCount(stats[item.key])}
                </span>
                <span className="byline text-meta">{item.label}</span>
              </button>
            ))}

          <div className="ml-auto flex items-center gap-2">
            {isOwnProfile ? (
              <motion.button
                whileTap={tapScale}
                onClick={onSettings}
                className="px-5 py-2.5 border border-foreground text-ink font-sans font-medium uppercase tracking-[0.16em] text-xs hover:bg-vocl-hover transition-colors"
              >
                Edit profile
              </motion.button>
            ) : (
              <>
                <motion.button
                  whileTap={tapScale}
                  transition={spring}
                  onClick={handleFollowToggle}
                  disabled={isLoading}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 font-sans font-medium uppercase tracking-[0.16em] text-xs transition-opacity disabled:opacity-50 ${
                    isFollowing
                      ? "border border-foreground text-ink hover:bg-vocl-hover"
                      : "bg-accent text-white hover:opacity-[0.88]"
                  }`}
                >
                  {isLoading && <IconLoader2 size={16} className="animate-spin" />}
                  {isFollowing ? "Subscribing" : "Subscribe"}
                  {isFollowing && !isLoading && <IconUserMinus size={14} />}
                </motion.button>
                {onMessage && (
                  <motion.button
                    whileTap={tapScale}
                    onClick={() => onMessage()}
                    className="px-4 py-2.5 border border-rule text-meta font-sans font-medium uppercase tracking-[0.16em] text-xs hover:text-ink hover:bg-vocl-hover transition-colors"
                  >
                    Message
                  </motion.button>
                )}
              </>
            )}

            {/* Secondary actions menu (Tip / Ask / Share / Mute / Report / Block) */}
            {!isOwnProfile && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  aria-label="More options"
                  className="p-2.5 border border-rule text-meta hover:text-ink hover:bg-vocl-hover transition-colors"
                >
                  <IconDots size={18} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-[110]" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-background border border-rule z-[120]">
                      {onTip && (
                        <MenuItem icon={<IconCoin size={18} />} label="Send a tip" onClick={() => { onTip(); setShowMenu(false); }} />
                      )}
                      {allowsAsks && onAsk && (
                        <MenuItem icon={<IconMessageQuestion size={18} />} label="Send an ask" onClick={() => { onAsk(); setShowMenu(false); }} />
                      )}
                      <MenuItem icon={<IconShare size={18} />} label="Share profile" onClick={() => { onShare?.(); setShowMenu(false); }} />
                      <MenuItem icon={<IconVolume3 size={18} />} label="Mute" onClick={() => { onMute?.(); setShowMenu(false); }} />
                      <MenuItem icon={<IconFlag size={18} />} label="Report" onClick={() => { onReport?.(); setShowMenu(false); }} />
                      <MenuItem icon={<IconBan size={18} />} label="Block" danger onClick={() => { onBlock?.(); setShowMenu(false); }} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  );
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
        danger ? "text-vocl-like hover:bg-vocl-like/10" : "text-meta hover:text-ink hover:bg-vocl-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
