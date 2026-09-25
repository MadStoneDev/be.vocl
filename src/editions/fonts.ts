// On-demand edition font loading.
//
// The four house families (Gloock, Source Serif 4, IBM Plex Sans/Mono) load via
// next/font on every page. Every other family loads only when an edition that
// needs it is on screen (the reader's reading edition, a visited profile's
// edition, or a picker preview). Colours render immediately with the fallback
// stack; fonts swap in with display=swap and never block paint (handoff §Font
// loading).
//
// Weights/styles come straight from the handoff's font table — requesting an
// axis a family doesn't publish makes Google's CSS2 endpoint reject the whole
// request, so keep these specs faithful to that table.

import { getEdition } from "./registry";
import type { Edition } from "./types";

interface FontSpec {
  /** Normal (upright) weights to request. */
  w: number[];
  /** Italic weights to request. Empty when the family ships no italic. */
  i?: number[];
}

// Loaded by next/font already — never request these from Google here.
const HOUSE_FAMILIES = new Set([
  "Gloock",
  "Source Serif 4",
  "IBM Plex Sans",
  "IBM Plex Mono",
]);

// Family (as it appears first in an editions.json font string) -> spec.
const FONT_SPECS: Record<string, FontSpec> = {
  "Atkinson Hyperlegible": { w: [400, 700], i: [400] },
  UnifrakturMaguntia: { w: [400] },
  "EB Garamond": { w: [400], i: [400] },
  "Alfa Slab One": { w: [400] },
  "Crimson Pro": { w: [400], i: [400] },
  "Archivo Narrow": { w: [400, 500] },
  "Special Elite": { w: [400] },
  "Courier Prime": { w: [400], i: [400] },
  "Young Serif": { w: [400] },
  Newsreader: { w: [400], i: [400] },
  "Cormorant Garamond": { w: [500], i: [500] },
  "Bodoni Moda": { w: [400], i: [400] },
  VT323: { w: [400] },
  Anton: { w: [400] },
  "IM Fell English": { w: [400], i: [400] },
  "Bricolage Grotesque": { w: [400, 600] },
  "Press Start 2P": { w: [400] },
  "Chakra Petch": { w: [400, 600] },
  "Mochiy Pop One": { w: [400] },
  "M PLUS Rounded 1c": { w: [400, 500] },
  "Big Shoulders Display": { w: [800] },
  Barlow: { w: [400], i: [400] },
  "Barlow Condensed": { w: [500] },
  "Alegreya SC": { w: [400] },
  Alegreya: { w: [400], i: [400] },
  "Alegreya Sans SC": { w: [500] },
  "Libre Caslon Display": { w: [400] },
  Spectral: { w: [400], i: [400] },
  "Instrument Serif": { w: [400] },
  "Instrument Sans": { w: [400], i: [400] },
  "DM Serif Display": { w: [400] },
  "Libre Franklin": { w: [400], i: [400] },
  Limelight: { w: [400] },
  "Libre Baskerville": { w: [400], i: [400] },
  Caprasimo: { w: [400] },
  Literata: { w: [400], i: [400] },
  "Zilla Slab": { w: [600] },
  "Space Mono": { w: [400] },
  Oswald: { w: [500] },
  "Cinzel Decorative": { w: [400] },
  "Rubik Mono One": { w: [400] },
  "Work Sans": { w: [400, 500], i: [400] },
  Bungee: { w: [400] },
  Figtree: { w: [400, 500], i: [400] },
  Italiana: { w: [400] },
  Lexend: { w: [300, 400] },
  Fredoka: { w: [600] },
  Nunito: { w: [400], i: [400] },
};

/** First family in a CSS font stack, stripped of quotes: "'Bodoni Moda', serif" -> "Bodoni Moda". */
function firstFamily(stack: string): string {
  return stack.split(",")[0].trim().replace(/^['"]|['"]$/g, "");
}

/** The distinct non-house Google families an edition needs, in load order. */
export function editionFamilies(edition: Edition): string[] {
  const stacks = [
    edition.fonts.nameplate,
    edition.fonts.headline,
    edition.fonts.body,
    edition.fonts.ui,
  ];
  const out: string[] = [];
  for (const stack of stacks) {
    const fam = firstFamily(stack);
    if (HOUSE_FAMILIES.has(fam)) continue;
    if (!FONT_SPECS[fam]) continue; // unknown family: skip rather than break the URL
    if (!out.includes(fam)) out.push(fam);
  }
  return out;
}

/** `family=` fragment for one family, e.g. "Bodoni+Moda:ital,wght@0,400;1,400". */
function familyFragment(fam: string): string {
  const spec = FONT_SPECS[fam];
  const enc = fam.replace(/ /g, "+");
  if (spec.i && spec.i.length) {
    const tuples = [
      ...spec.w.map((w) => [0, w] as const),
      ...spec.i.map((w) => [1, w] as const),
    ].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return `${enc}:ital,wght@${tuples.map(([s, w]) => `${s},${w}`).join(";")}`;
  }
  return `${enc}:wght@${[...spec.w].sort((a, b) => a - b).join(";")}`;
}

/** Google Fonts CSS2 href for a set of families, or null if none are needed. */
export function googleFontsHref(families: string[]): string | null {
  if (!families.length) return null;
  const params = families.map((f) => `family=${familyFragment(f)}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

const injected = new Set<string>();

/**
 * Inject (idempotently) the stylesheet for an edition's fonts. No-op on the
 * server, for house-only editions, and for editions already loaded. Safe to
 * call on hover/preview and on mount.
 */
export function loadEditionFonts(editionId: string | null | undefined): void {
  if (typeof document === "undefined" || !editionId) return;
  if (injected.has(editionId)) return;
  const edition = getEdition(editionId);
  if (!edition) return;
  const href = googleFontsHref(editionFamilies(edition));
  injected.add(editionId); // mark even when href is null (house-only) to skip re-checks
  if (!href) return;
  if (document.querySelector(`link[data-edition-fonts="${editionId}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.setAttribute("data-edition-fonts", editionId);
  document.head.appendChild(link);
}
