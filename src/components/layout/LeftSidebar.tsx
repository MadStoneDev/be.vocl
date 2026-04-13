"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  IconHome,
  IconHomeFilled,
  IconSearch,
  IconBell,
  IconBellFilled,
  IconMessage,
  IconMessageFilled,
  IconSettings,
  IconStack2,
  IconUsersGroup,
  IconLogout,
  IconShield,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui";
import Logo from "@/components/logo";

interface LeftSidebarProps {
  username?: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  messageCount?: number;
  onChatToggle?: () => void;
  isLoading?: boolean;
  role?: number;
  collapsed?: boolean;
}

export function LeftSidebar({
  username,
  avatarUrl,
  notificationCount = 0,
  messageCount = 0,
  onChatToggle,
  isLoading = false,
  role = 0,
  collapsed = false,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const navItems = [
    { href: "/feed", icon: IconHome, iconActive: IconHomeFilled, label: "Home" },
    { href: "/search", icon: IconSearch, iconActive: IconSearch, label: "Search" },
    {
      href: "/notifications",
      icon: IconBell,
      iconActive: IconBellFilled,
      label: "Notifications",
      badge: notificationCount,
    },
    {
      action: onChatToggle,
      icon: IconMessage,
      iconActive: IconMessageFilled,
      label: "Messages",
      badge: messageCount,
    },
    { href: "/queue", icon: IconStack2, iconActive: IconStack2, label: "Queue" },
    { href: "/communities", icon: IconUsersGroup, iconActive: IconUsersGroup, label: "Communities" },
  ];

  return (
    <aside
      className={`hidden md:flex fixed left-0 top-0 bottom-0 flex-col bg-background border-r border-white/5 z-40 transition-all duration-300 ease-in-out ${
        collapsed ? "w-16" : "w-52 lg:w-56"
      }`}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center overflow-hidden transition-all duration-300 ${collapsed ? "px-3 justify-center" : "px-5"}`}>
        <Link
          href="/feed"
          className="font-display text-xl text-foreground hover:text-vocl-accent transition-colors flex-shrink-0"
        >
          {collapsed ? (
            <Image
              src="/bevocl-pink-symbol logo.svg"
              alt="be.vocl"
              width={28}
              height={28}
              className="transition-all duration-300"
            />
          ) : (
            <Logo className="w-36 transition-all duration-300" />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 transition-all duration-300 ${collapsed ? "px-2" : "px-3"}`}>
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const isActive = item.href
              ? pathname === item.href || pathname.startsWith(item.href + "/")
              : false;
            const Icon = isActive ? item.iconActive : item.icon;
            const badgeCount = item.badge ?? 0;
            const showBadge = badgeCount > 0;

            if (item.action) {
              return (
                <li key={index}>
                  <button
                    type="button"
                    onClick={item.action}
                    title={collapsed ? item.label : undefined}
                    aria-label={
                      showBadge
                        ? `${item.label}, ${badgeCount} unread`
                        : item.label
                    }
                    className={`relative w-full flex items-center rounded-xl text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all duration-300 ${
                      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                    }`}
                  >
                    <span className="relative inline-flex flex-shrink-0">
                      <Icon size={22} aria-hidden="true" />
                      {showBadge && (
                        <span
                          className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-vocl-like text-white text-[10px] font-bold"
                          aria-hidden="true"
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                    </span>
                    <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center rounded-xl transition-all duration-300 ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } ${
                    isActive
                      ? "bg-vocl-accent/10 text-vocl-accent font-semibold"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Icon size={22} aria-hidden="true" />
                    {showBadge && (
                      <span
                        className="absolute -top-2 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-vocl-like text-white text-[10px] font-bold"
                        aria-label={`${badgeCount} unread`}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </span>
                  <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section - Profile & Settings */}
      <div className={`border-t border-white/5 transition-all duration-300 ${collapsed ? "p-2" : "p-3"}`}>
        {/* Admin Dashboard - only for staff (role >= 5) */}
        {role >= 5 && (
          <Link
            href="/admin"
            title={collapsed ? "Admin" : undefined}
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={`flex items-center rounded-xl transition-all duration-300 ${
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
            } ${
              pathname.startsWith("/admin")
                ? "bg-amber-500/10 text-amber-500"
                : "text-amber-500/70 hover:text-amber-500 hover:bg-amber-500/10"
            }`}
          >
            <IconShield size={22} aria-hidden="true" className="flex-shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
              Admin
            </span>
          </Link>
        )}

        {/* Settings */}
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`flex items-center rounded-xl transition-all duration-300 ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          } ${role >= 5 ? "mt-1" : ""} ${
            pathname.startsWith("/settings")
              ? "bg-vocl-accent/10 text-vocl-accent"
              : "text-foreground/70 hover:text-foreground hover:bg-white/5"
          }`}
        >
          <IconSettings size={22} aria-hidden="true" className="flex-shrink-0" />
          <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
            Settings
          </span>
        </Link>

        {/* Profile - link to user's public profile */}
        {username ? (
          <Link
            href={`/profile/${username}`}
            title={collapsed ? `@${username}` : undefined}
            aria-label="Your profile"
            className={`flex items-center mt-1 rounded-xl transition-all duration-300 ${
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 pl-1 pr-3 py-2.5"
            } ${
              pathname === `/profile/${username}`
                ? "bg-vocl-accent/10 text-vocl-accent"
                : "text-foreground/70 hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Avatar
              src={avatarUrl}
              username={username}
              size="sm"
            />
            <span className={`text-sm font-medium truncate whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
              @{username}
            </span>
          </Link>
        ) : (
          <div className={`flex items-center mt-1 rounded-xl text-foreground/70 transition-all duration-300 ${collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"}`}>
            <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
            <span className={`h-4 w-20 bg-white/10 rounded animate-pulse transition-all duration-300 ${collapsed ? "hidden" : ""}`} />
          </div>
        )}

        {/* Hide/Show Browser UI */}
        <button
          type="button"
          onClick={toggleFullscreen}
          title={collapsed ? (isFullscreen ? "Exit Fullscreen" : "Fullscreen") : undefined}
          className={`flex items-center mt-1 w-full rounded-xl text-foreground/50 hover:text-foreground hover:bg-white/5 transition-all duration-300 ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
          }`}
        >
          {isFullscreen ? <IconMinimize size={22} aria-hidden="true" className="flex-shrink-0" /> : <IconMaximize size={22} aria-hidden="true" className="flex-shrink-0" />}
          <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </span>
        </button>

        {/* Logout */}
        {username && (
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={`flex items-center mt-1 w-full rounded-xl text-foreground/50 hover:text-vocl-like hover:bg-vocl-like/10 transition-all duration-300 ${
              collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <IconLogout size={22} aria-hidden="true" className="flex-shrink-0" />
            <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"}`}>
              Logout
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
