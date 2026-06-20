"use client";

import { useEffect, useState } from "react";
import { formatTimeAgo } from "@/lib/time";

interface TimeAgoProps {
  iso: string;
  className?: string;
}

/**
 * Renders a human-readable relative timestamp that updates over time.
 * `suppressHydrationWarning` covers the (sub-second) server/client difference
 * in "now" — the value reconciles on mount.
 */
export function TimeAgo({ iso, className }: TimeAgoProps) {
  const [text, setText] = useState(() => formatTimeAgo(iso));

  useEffect(() => {
    const update = () => setText(formatTimeAgo(iso));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {text}
    </time>
  );
}
