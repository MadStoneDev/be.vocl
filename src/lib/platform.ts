"use client";

import { useEffect, useState } from "react";

/** True on macOS / iOS (where the modifier key is ⌘ rather than Ctrl). */
export function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform =
    (navigator as unknown as { userAgentData?: { platform?: string } })
      .userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * Returns the platform modifier label ("⌘" on Mac, "Ctrl" elsewhere). Defaults
 * to "Ctrl" on the server / first paint to avoid a hydration mismatch, then
 * resolves after mount.
 */
export function useModKey(): { isMac: boolean; mod: string } {
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(isMac()), []);
  return { isMac: mac, mod: mac ? "⌘" : "Ctrl" };
}
