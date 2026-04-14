"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowDown, IconLoader2 } from "@tabler/icons-react";

const TRIGGER_DISTANCE = 70;
const MAX_PULL = 120;
const RUBBER_FACTOR = 0.5;

interface PullToRefreshProps {
  onRefresh: () => void | Promise<unknown>;
  children: React.ReactNode;
  /** Disable on this surface. Useful per-route flags. */
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      // Only engage when at the very top of the page
      if (window.scrollY > 0) {
        startYRef.current = null;
        return;
      }
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (refreshing || startYRef.current === null) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Once we know it's a downward pull at top of page, take over and
      // prevent native rubber-banding so our indicator is the only thing visible.
      if (delta > 8) isPullingRef.current = true;
      if (isPullingRef.current) {
        e.preventDefault();
        const eased = Math.min(MAX_PULL, delta * RUBBER_FACTOR);
        setPullDistance(eased);
      }
    }

    async function onTouchEnd() {
      if (refreshing || startYRef.current === null) {
        startYRef.current = null;
        isPullingRef.current = false;
        return;
      }
      const distance = pullDistance;
      startYRef.current = null;
      isPullingRef.current = false;

      if (distance >= TRIGGER_DISTANCE) {
        setRefreshing(true);
        setPullDistance(TRIGGER_DISTANCE);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [onRefresh, pullDistance, refreshing, disabled]);

  const triggered = pullDistance >= TRIGGER_DISTANCE;
  const progress = Math.min(1, pullDistance / TRIGGER_DISTANCE);

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        aria-hidden={pullDistance === 0 && !refreshing}
        className="pointer-events-none absolute left-0 right-0 top-0 flex justify-center transition-transform"
        style={{
          transform: `translateY(${refreshing ? TRIGGER_DISTANCE / 2 : pullDistance / 2}px)`,
          opacity: refreshing ? 1 : progress,
        }}
      >
        <div className="mt-2 w-9 h-9 rounded-full bg-vocl-surface-dark border border-white/10 shadow-lg flex items-center justify-center">
          {refreshing ? (
            <IconLoader2 size={18} className="animate-spin text-vocl-accent" />
          ) : (
            <IconArrowDown
              size={18}
              className={`transition-transform ${triggered ? "rotate-180 text-vocl-accent" : "text-foreground/60"}`}
            />
          )}
        </div>
      </div>

      {/* Content shifts down with the pull */}
      <div
        style={{
          transform: `translateY(${refreshing ? TRIGGER_DISTANCE : pullDistance}px)`,
          transition: pullDistance === 0 || refreshing ? "transform 0.2s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
