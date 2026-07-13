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
      <div className="absolute -top-3 right-4 z-10 flex items-center gap-1.5 px-3 py-1 rounded-full bg-vocl-primary text-white text-xs font-medium shadow-lg">
        <IconPin size={12} />
        <span>Pinned</span>
      </div>

      {/* Post wrapper with subtle highlight — square to match the editorial
          post border, with just the bottom-right corner curved to echo the
          reblog button that sits there. */}
      <div className="ring-2 ring-vocl-primary/30 rounded-br-[50px]">
        {children}
      </div>
    </div>
  );
}
