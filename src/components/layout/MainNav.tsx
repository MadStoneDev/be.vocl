"use client";

import Link from "next/link";
import Image from "next/image";
import {
  IconPlus,
  IconUser,
} from "@tabler/icons-react";

interface MainNavProps {
  username?: string;
  avatarUrl?: string | null;
}

export function MainNav({
  username,
  avatarUrl,
}: MainNavProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 md:hidden">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="font-display text-xl text-foreground hover:text-vocl-accent transition-colors">
          be.vocl
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Create Post Button */}
          <Link
            href="/create"
            aria-label="Create post"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-vocl-accent text-white hover:bg-vocl-accent-hover transition-colors"
          >
            <IconPlus size={18} aria-hidden="true" />
          </Link>

          {/* Profile */}
          <Link
            href={username ? `/profile/${username}` : "/settings"}
            aria-label="Your profile"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-vocl-surface-dark overflow-hidden hover:ring-2 hover:ring-vocl-accent transition-all"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                width={36}
                height={36}
                className="object-cover"
              />
            ) : (
              <IconUser size={18} aria-hidden="true" />
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
