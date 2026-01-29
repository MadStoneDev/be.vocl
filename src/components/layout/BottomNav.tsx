"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconHomeFilled,
  IconSearch,
  IconBell,
  IconBellFilled,
  IconMessage,
  IconMessageFilled,
  IconPlus,
} from "@tabler/icons-react";

interface BottomNavProps {
  notificationCount?: number;
  messageCount?: number;
  onChatToggle?: () => void;
}

export function BottomNav({
  notificationCount = 0,
  messageCount = 0,
  onChatToggle,
}: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/feed",
      icon: IconHome,
      iconActive: IconHomeFilled,
      label: "Home",
    },
    {
      href: "/search",
      icon: IconSearch,
      iconActive: IconSearch,
      label: "Search",
    },
    {
      href: "/create",
      icon: IconPlus,
      iconActive: IconPlus,
      label: "Create",
      isCreate: true,
    },
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
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-white/5 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item, index) => {
          const isActive = item.href
            ? pathname === item.href || pathname.startsWith(item.href + "/")
            : false;
          const Icon = isActive ? item.iconActive : item.icon;
          const badgeCount = item.badge ?? 0;
          const showBadge = badgeCount > 0;

          if (item.action) {
            return (
              <button
                key={index}
                type="button"
                onClick={item.action}
                aria-label={showBadge ? `${item.label}, ${badgeCount} unread` : item.label}
                className="relative flex items-center justify-center w-12 h-12 text-foreground/60 hover:text-foreground transition-colors"
              >
                <span className="relative inline-flex">
                  <Icon size={26} aria-hidden="true" />
                  {showBadge && (
                    <span
                      className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-vocl-like text-white text-[10px] font-bold"
                      aria-hidden="true"
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </span>
              </button>
            );
          }

          if (item.isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href!}
                aria-label="Create post"
                className="flex items-center justify-center w-12 h-12 rounded-full bg-vocl-accent text-white shadow-lg shadow-vocl-accent/30"
              >
                <Icon size={26} aria-hidden="true" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              aria-current={isActive ? "page" : undefined}
              aria-label={showBadge ? `${item.label}, ${badgeCount} unread` : item.label}
              className={`relative flex items-center justify-center w-12 h-12 transition-colors ${
                isActive ? "text-vocl-accent" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <span className="relative inline-flex">
                <Icon size={26} aria-hidden="true" />
                {showBadge && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-vocl-like text-white text-[10px] font-bold"
                    aria-hidden="true"
                  >
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
