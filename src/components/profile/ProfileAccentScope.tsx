"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { getEdition } from "@/editions/registry";
import { loadEditionFonts } from "@/editions/fonts";

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Scopes a profile's presentation to its subtree:
 *  - the owner's chosen **edition** (colours, fonts, rules) via `data-edition`
 *    on a display:contents wrapper — token-only, so it adds no layout box and
 *    the visited profile column re-skins while the global SectionsRail stays in
 *    the reader's edition;
 *  - the owner's per-profile **accent** via --vocl-primary / --vocl-accent.
 *
 * `editionId` should already be the *resolved* edition for this reader (owner
 * entitlement + the reader's alwaysReadInMyEdition), from resolveEdition on the
 * server. If neither an edition nor a valid accent is provided, children render
 * unwrapped, exactly as before.
 */
export function ProfileAccentScope({
  accent,
  editionId,
  children,
}: {
  accent?: string | null;
  editionId?: string | null;
  children: ReactNode;
}) {
  const edition = getEdition(editionId);

  useEffect(() => {
    if (edition) loadEditionFonts(edition.id);
  }, [edition?.id]);

  const hasAccent = !!accent && HEX_RE.test(accent.trim());

  if (!hasAccent && !edition) {
    return <>{children}</>;
  }

  const style = hasAccent
    ? ({
        "--vocl-primary": accent!.trim(),
        "--vocl-accent": accent!.trim(),
      } as CSSProperties)
    : undefined;

  // display:contents => the wrapper carries CSS custom properties (which inherit
  // regardless of display) without introducing a box that could shift layout.
  return (
    <div
      className="contents"
      data-edition={edition ? edition.id : undefined}
      style={style}
    >
      {children}
    </div>
  );
}
