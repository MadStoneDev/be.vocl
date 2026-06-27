import { useRef } from "react";

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance (px) to count as a swipe. */
  threshold?: number;
}

/**
 * Lightweight horizontal-swipe detection for touch devices. Ignores
 * mostly-vertical gestures (so it never hijacks scrolling) and any gesture that
 * begins inside an element marked `data-no-swipe` (e.g. horizontal carousels,
 * sliders) so those keep their own horizontal behaviour.
 *
 * Spread the returned handlers onto the element you want to be swipeable:
 *   const swipe = useSwipe({ onSwipeLeft, onSwipeRight });
 *   <div {...swipe}>…</div>
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 70,
}: UseSwipeOptions) {
  const start = useRef<{ x: number; y: number; valid: boolean } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const valid = !(e.target as HTMLElement)?.closest?.("[data-no-swipe]");
    start.current = { x: t.clientX, y: t.clientY, valid };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.valid) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    // Horizontal intent: clearly sideways, and dominant over vertical movement.
    if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    }
  };

  return { onTouchStart, onTouchEnd };
}
