"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconSearch,
  IconBell,
  IconSettings,
  IconPlus,
  IconUser,
  IconMessage,
} from "@tabler/icons-react";

interface MainNavProps {
  username?: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  messageCount?: number;
  onChatToggle?: () => void;
}

export function MainNav({
  username,
  notificationCount = 0,
  messageCount = 0,
  onChatToggle,
}: MainNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/feed", icon: IconHome, label: "Feed" },
    { href: "/search", icon: IconSearch, label: "Search" },
    { href: "/notifications", icon: IconBell, label: "Notifications", badge: notificationCount },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/feed" className="font-display text-2xl text-foreground hover:text-vocl-accent transition-colors">
          be.vocl
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  isActive
                    ? "bg-vocl-accent/10 text-vocl-accent"
                    : "text-foreground/60 hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center px-1.5 rounded-full bg-vocl-like text-white text-xs font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Create Post Button */}
          <Link
            href="/create"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
          >
            <IconPlus size={18} />
            <span className="hidden sm:inline">Create</span>
          </Link>

          {/* Chat Toggle (Desktop) */}
          <button
            type="button"
            onClick={onChatToggle}
            className="hidden md:flex relative items-center justify-center w-10 h-10 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconMessage size={22} />
            {messageCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 flex items-center justify-center px-1 rounded-full bg-vocl-like text-white text-[10px] font-bold">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className="hidden md:flex items-center justify-center w-10 h-10 rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconSettings size={22} />
          </Link>

          {/* Profile */}
          <Link
            href={username ? `/profile/${username}` : "/settings"}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-vocl-surface-dark text-foreground hover:ring-2 hover:ring-vocl-accent transition-all"
          >
            <IconUser size={20} />
          </Link>
        </div>
      </div>
    </nav>
  );
}
