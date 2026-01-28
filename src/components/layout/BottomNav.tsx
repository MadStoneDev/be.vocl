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
      label: "Alerts",
      badge: notificationCount,
    },
    {
      action: onChatToggle,
      icon: IconMessage,
      iconActive: IconMessageFilled,
      label: "Chat",
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

          if (item.action) {
            return (
              <button
                key={index}
                type="button"
                onClick={item.action}
                className="relative flex flex-col items-center justify-center w-16 h-full text-foreground/60 hover:text-foreground transition-colors"
              >
                <Icon size={24} />
                <span className="text-[10px] mt-0.5">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-2 min-w-4 h-4 flex items-center justify-center px-1 rounded-full bg-vocl-like text-white text-[10px] font-bold">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          }

          if (item.isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href!}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-vocl-accent text-white shadow-lg shadow-vocl-accent/30"
              >
                <Icon size={26} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`relative flex flex-col items-center justify-center w-16 h-full transition-colors ${
                isActive ? "text-vocl-accent" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              <Icon size={24} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-2 min-w-4 h-4 flex items-center justify-center px-1 rounded-full bg-vocl-like text-white text-[10px] font-bold">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
