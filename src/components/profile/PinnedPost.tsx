"use client";

import { IconPin } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface PinnedPostProps {
  children: ReactNode;
}

export function PinnedPost({ children }: PinnedPostProps) {
  return (
    <div className="relative">
      {/* Pinned marker — a kicker, not a floating pill. */}
      <div className="flex items-center gap-1.5 mb-2 kicker kicker-accent">
        <IconPin size={11} />
        <span>Pinned</span>
      </div>

      {/* Editorial highlight: a 2px accent left rule, radius 0 — no ring/shadow. */}
      <div className="border-l-2 border-accent pl-4">{children}</div>
    </div>
  );
}
