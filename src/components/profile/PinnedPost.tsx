"use client";

import { IconPin } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface PinnedPostProps {
  children: ReactNode;
}

export function PinnedPost({ children }: PinnedPostProps) {
  return (
    <div className="relative">
      {/* Pinned badge */}
      <div className="absolute -top-3 left-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-vocl-accent text-white text-xs font-medium shadow-lg">
        <IconPin size={12} />
        <span>Pinned</span>
      </div>

      {/* Post wrapper with subtle highlight */}
      <div className="ring-2 ring-vocl-accent/30 rounded-[50px]">
        {children}
      </div>
    </div>
  );
}
