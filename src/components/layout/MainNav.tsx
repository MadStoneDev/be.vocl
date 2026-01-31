"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconUser,
  IconSettings,
  IconShield,
  IconLogout,
  IconDots,
} from "@tabler/icons-react";
import Logo from "@/components/logo";
import { createClient } from "@/lib/supabase/client";

interface MainNavProps {
  username?: string;
  avatarUrl?: string | null;
  role?: number;
}

export function MainNav({
  username,
  avatarUrl,
  role = 0,
}: MainNavProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 md:hidden">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="font-display text-xl text-foreground hover:text-vocl-accent transition-colors">
          <Logo />
        </Link>

        {/* Right side actions */}
        <div className="flex items-center gap-1">
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

          {/* More menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="More options"
              className="flex items-center justify-center w-9 h-9 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <IconDots size={20} aria-hidden="true" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 shadow-xl z-50">
                  {/* Admin - only for staff */}
                  {role >= 5 && (
                    <Link
                      href="/admin"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-amber-500 hover:bg-amber-500/10 transition-colors"
                    >
                      <IconShield size={18} />
                      Admin Dashboard
                    </Link>
                  )}

                  {/* Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconSettings size={18} />
                    Settings
                  </Link>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors"
                  >
                    <IconLogout size={18} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
