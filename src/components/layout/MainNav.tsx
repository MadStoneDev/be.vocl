"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  IconPlus,
  IconSettings,
  IconShield,
  IconLogout,
  IconDots,
  IconMaximize,
  IconMinimize,
  IconStack2,
  IconCompass,
  IconUsersGroup,
  IconCoin,
  IconArrowLeft,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
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
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Top-level routes (no back button); everything else gets one.
  const rootRoutes = ["/feed", "/search", "/notifications", "/create"];
  const showBack = !!pathname && !rootRoutes.includes(pathname);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/feed");
    }
  };

  // Track fullscreen state changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch {
      // Fullscreen API not supported or denied
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5 md:hidden">
      <div className="px-3 h-12 flex items-center justify-between">
        {/* Left: Back button on sub-pages, Logo on root routes */}
        <div className="flex items-center gap-1">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              aria-label="Go back"
              className="w-9 h-9 flex items-center justify-center rounded-full text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
            >
              <IconArrowLeft size={20} />
            </button>
          )}
          <Link href="/feed" className="font-display text-xl text-foreground hover:text-vocl-accent transition-colors">
            <Logo className={`min-h-12.5`} />
          </Link>
        </div>

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
            className="ml-2 ring ring-white hover:ring-2 hover:ring-vocl-accent transition-all rounded-full"
          >
            <Avatar
              src={avatarUrl}
              username={username || "-user"}
              size="sm"
            />
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

                  {/* Fullscreen / Hide Browser UI */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      toggleFullscreen();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    {isFullscreen ? <IconMinimize size={18} /> : <IconMaximize size={18} />}
                    {isFullscreen ? "Show Browser UI" : "Hide Browser UI"}
                  </button>

                  {/* Explore */}
                  <Link
                    href="/explore"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconCompass size={18} />
                    Explore
                  </Link>

                  {/* Communities */}
                  <Link
                    href="/communities"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconUsersGroup size={18} />
                    Communities
                  </Link>

                  {/* Queue & Schedule */}
                  <Link
                    href="/queue"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconStack2 size={18} />
                    Queue & Schedule
                  </Link>

                  {/* Tips */}
                  <Link
                    href="/tips"
                    onClick={() => setShowMenu(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-colors"
                  >
                    <IconCoin size={18} />
                    Tips
                  </Link>

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
