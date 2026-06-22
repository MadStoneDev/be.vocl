"use client";

import type { CSSProperties, ReactNode } from "react";

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Scopes a per-profile accent color to its children by overriding the
 * --vocl-primary (and legacy --vocl-accent) CSS custom properties. Buttons,
 * links, and active states within the profile pick up the blog owner's chosen
 * color. If no valid hex accent is provided, children render unwrapped.
 */
export function ProfileAccentScope({
  accent,
  children,
}: {
  accent?: string | null;
  children: ReactNode;
}) {
  if (!accent || !HEX_RE.test(accent.trim())) {
    return <>{children}</>;
  }

  const value = accent.trim();
  const style = {
    "--vocl-primary": value,
    "--vocl-accent": value,
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
