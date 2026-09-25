// Client-side application of the reader's *reading edition* — the global
// `data-edition` on <html> that skins the feed, posts, messages, sidebar and
// settings. (A visited profile's edition is applied server-side on the profile
// column instead; see EditionScope.)
//
// Mirrors src/lib/accent.ts: a localStorage-backed value plus a no-flash boot
// script injected in the root layout. For signed-in users the value is also
// persisted to the DB (profiles.reading_edition) and reconciled on load.
//
// Not a "use client" module: like src/lib/accent.ts every function guards on
// `typeof document`, so the boot-script string can be imported by the server
// root layout while the functions run only in the browser.

import { getEdition, DEFAULT_EDITION_ID } from "./registry";
import { loadEditionFonts } from "./fonts";

export const EDITION_STORAGE_KEY = "bv_edition";
export const TEXTURE_STORAGE_KEY = "bv_texture";

function relLuminance(hex: string): number {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True when an edition's paper is dark — used to sync the light/dark class. */
export function isDarkEdition(id: string | null | undefined): boolean {
  const ed = getEdition(id);
  if (!ed) return true; // house default (Late) is dark
  return relLuminance(ed.colors.paper) < 0.35;
}

/**
 * Apply a reading edition to <html> and persist it locally. Loads the edition's
 * fonts. Does NOT touch the next-themes light/dark class — the caller syncs that
 * (setTheme) so `dark:` utilities and color-scheme match the edition's luminance.
 */
export function applyReadingEdition(id: string): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const edition = getEdition(id) ? id : DEFAULT_EDITION_ID;
  root.setAttribute("data-edition", edition);
  loadEditionFonts(edition);
  try {
    localStorage.setItem(EDITION_STORAGE_KEY, edition);
  } catch {}
}

/** Turn the edition's paper texture on/off for this reader. */
export function applyPaperTexture(on: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (on) {
    root.removeAttribute("data-texture");
    try {
      localStorage.removeItem(TEXTURE_STORAGE_KEY);
    } catch {}
  } else {
    root.setAttribute("data-texture", "off");
    try {
      localStorage.setItem(TEXTURE_STORAGE_KEY, "off");
    } catch {}
  }
}

/**
 * Inline boot script (stringified) that restores data-edition / data-texture
 * before first paint, so there's no flash of the default edition on reload.
 */
export const EDITION_BOOT_SCRIPT = `(function(){try{var e=localStorage.getItem('${EDITION_STORAGE_KEY}');if(e)document.documentElement.setAttribute('data-edition',e);var t=localStorage.getItem('${TEXTURE_STORAGE_KEY}');if(t==='off')document.documentElement.setAttribute('data-texture','off');}catch(e){}})();`;
