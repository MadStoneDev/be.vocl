"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyMountProps {
  children: ReactNode;
  /** Reserved height (px) before the content mounts, to avoid layout jumps. */
  minHeight?: number;
  /** How far ahead of the viewport to start mounting. */
  rootMargin?: string;
  className?: string;
}

/**
 * Renders `children` only once the wrapper scrolls near the viewport, then keeps
 * them mounted. Lets a long list defer expensive children (images, media
 * players, per-item data fetches) until they're actually needed.
 */
export function LazyMount({
  children,
  minHeight = 200,
  rootMargin = "600px",
  className,
}: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const el = ref.current;
    if (!el) return;
    // No IntersectionObserver (old browsers / SSR edge) → just show.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return (
    <div ref={ref} className={className} style={shown ? undefined : { minHeight }}>
      {shown ? children : null}
    </div>
  );
}
