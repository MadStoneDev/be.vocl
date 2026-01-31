"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import {
  IconHome,
  IconHomeFilled,
  IconSearch,
  IconBell,
  IconBellFilled,
  IconMessage,
  IconMessageFilled,
  IconSettings,
  IconUser,
  IconStack2,
  IconLogout,
} from "@tabler/icons-react";

interface LeftSidebarProps {
  username?: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  messageCount?: number;
  onChatToggle?: () => void;
}

export function LeftSidebar({
  username,
  avatarUrl,
  notificationCount = 0,
  messageCount = 0,
  onChatToggle,
}: LeftSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return;

    const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
    await supabase.auth.signOut();
    router.push("/login");
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
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-52 lg:w-56 flex-col bg-background border-r border-white/5 z-40">
      {/* Logo */}
      <div className="h-16 flex items-center px-5">
        <Link
          href="/feed"
          className="font-display text-xl text-foreground hover:text-vocl-accent transition-colors"
        >
          be.vocl
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
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
                    aria-label={
                      showBadge
                        ? `${item.label}, ${badgeCount} unread`
                        : item.label
                    }
                    className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all"
                  >
                    <span className="relative inline-flex">
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
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                </li>
              );
            }

            return (
              <li key={item.href}>
                <Link
                  href={item.href!}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? "bg-vocl-accent/10 text-vocl-accent font-semibold"
                      : "text-foreground/70 hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span className="relative inline-flex">
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
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section - Profile & Settings */}
      <div className="p-3 border-t border-white/5">
        {/* Settings */}
        <Link
          href="/settings"
          aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
            pathname.startsWith("/settings")
              ? "bg-vocl-accent/10 text-vocl-accent"
              : "text-foreground/70 hover:text-foreground hover:bg-white/5"
          }`}
        >
          <IconSettings size={22} aria-hidden="true" />
          <span className="text-sm font-medium">Settings</span>
        </Link>

        {/* Profile */}
        <Link
          href={username ? `/profile/${username}` : "/settings"}
          aria-label="Your profile"
          className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all"
        >
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-vocl-surface-dark flex-shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <IconUser size={16} aria-hidden="true" />
              </div>
            )}
          </div>
          <span className="text-sm font-medium truncate">
            {username ? `@${username}` : "Profile"}
          </span>
        </Link>

        {/* Logout */}
        {username && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 mt-1 w-full rounded-xl text-foreground/50 hover:text-vocl-like hover:bg-vocl-like/10 transition-all"
          >
            <IconLogout size={22} aria-hidden="true" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        )}
      </div>
    </aside>
  );
}
