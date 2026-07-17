"use client";

import { useEffect, useState } from "react";

/**
 * Auto-hiding header state for a sticky bar. Returns `true` when the bar should
 * be hidden — i.e. the reader is scrolling *down* past `threshold`. Scrolling
 * up (or sitting near the top) reveals it again. Classic "follow the reader"
 * behaviour: the nav gets out of the way while you read, and comes back the
 * instant you reach for it.
 */
export function useAutoHide(threshold = 80): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - last;
        if (y < threshold) {
          setHidden(false); // always show near the top
        } else if (Math.abs(delta) > 6) {
          setHidden(delta > 0); // hide on down, reveal on up (small jitter ignored)
        }
        last = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
