"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { IconBell } from "@tabler/icons-react";

interface NotificationBellProps {
  unreadCount: number;
  onClick?: () => void;
}

export function NotificationBell({ unreadCount, onClick }: NotificationBellProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevCount = useRef(unreadCount);

  // Animate when count increases
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    }
    prevCount.current = unreadCount;
  }, [unreadCount]);

  return (
    <Link
      href="/notifications"
      onClick={onClick}
      className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group"
    >
      <IconBell
        size={24}
        className={`text-foreground/70 group-hover:text-foreground transition-all ${
          isAnimating ? "animate-wiggle" : ""
        }`}
      />

      {/* Badge */}
      {unreadCount > 0 && (
        <span
          className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-vocl-like text-white text-xs font-bold transition-transform ${
            isAnimating ? "scale-125" : "scale-100"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {/* Pulse effect for new notifications */}
      {unreadCount > 0 && isAnimating && (
        <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-vocl-like animate-ping" />
      )}
    </Link>
  );
}

// Add this to your globals.css or tailwind config:
// @keyframes wiggle {
//   0%, 100% { transform: rotate(0deg); }
//   25% { transform: rotate(-10deg); }
//   50% { transform: rotate(10deg); }
//   75% { transform: rotate(-5deg); }
// }
// .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
