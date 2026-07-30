// Site-wide UI accent (a personal, per-device preference stored in localStorage).
// Overrides --vocl-primary / --vocl-primary-hover on :root so buttons, links,
// and highlights across the whole app follow the user's chosen colour.
//
// This is distinct from a profile's *accent_color* (saved to the DB and applied
// only within that profile's page via ProfileAccentScope).

export interface AccentOption {
  /** stable id persisted in appearance-settings */
  name: string;
  label: string;
  /** hex applied to --vocl-primary */
  color: string;
}

/** Storage key holding the resolved hex — read by the no-flash boot script. */
export const ACCENT_STORAGE_KEY = "vocl-accent";

/** Brand default. Selecting this clears the override so the CSS default applies. */
export const BRAND_ACCENT = "#F20D5E";

export const ACCENTS: AccentOption[] = [
  { name: "pink", label: "Brand Pink", color: BRAND_ACCENT },
  { name: "rose", label: "Rose", color: "#F43F5E" },
  { name: "red", label: "Red", color: "#EF4444" },
  { name: "orange", label: "Orange", color: "#F97316" },
  { name: "amber", label: "Amber", color: "#F59E0B" },
  { name: "green", label: "Green", color: "#22C55E" },
  { name: "emerald", label: "Emerald", color: "#10B981" },
  { name: "teal", label: "Teal", color: "#14B8A6" },
  { name: "cyan", label: "Cyan", color: "#06B6D4" },
  { name: "blue", label: "Blue", color: "#3B82F6" },
  { name: "indigo", label: "Indigo", color: "#6366F1" },
  { name: "violet", label: "Violet", color: "#8B5CF6" },
  { name: "purple", label: "Purple", color: "#A855F7" },
  { name: "slate", label: "Slate", color: "#64748B" },
];

/** Darken a hex colour by `factor` (0–1) for the hover shade. */
export function darken(hex: string, factor = 0.85): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((x) => x + x).join("");
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const to = (v: number) => ("0" + Math.round(v * factor).toString(16)).slice(-2);
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Apply (or clear) the accent on :root and persist it. Client-only. */
export function applyAccent(color: string | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!color || color.toLowerCase() === BRAND_ACCENT.toLowerCase()) {
    root.style.removeProperty("--vocl-primary");
    root.style.removeProperty("--vocl-primary-hover");
    try {
      localStorage.removeItem(ACCENT_STORAGE_KEY);
    } catch {}
    return;
  }
  root.style.setProperty("--vocl-primary", color);
  root.style.setProperty("--vocl-primary-hover", darken(color));
  try {
    localStorage.setItem(ACCENT_STORAGE_KEY, color);
  } catch {}
}

/**
 * Inline boot script (stringified) that applies the saved accent before first
 * paint, so there's no flash of the default colour on reload. Injected into the
 * document via the root layout.
 */
export const ACCENT_BOOT_SCRIPT = `(function(){try{var c=localStorage.getItem('${ACCENT_STORAGE_KEY}');if(!c)return;var d=document.documentElement;d.style.setProperty('--vocl-primary',c);var h=c.replace('#','');if(h.length===3)h=h.split('').map(function(x){return x+x}).join('');var n=parseInt(h,16),r=(n>>16)&255,g=(n>>8)&255,b=n&255;var f=0.85;var to=function(v){return('0'+Math.round(v*f).toString(16)).slice(-2)};d.style.setProperty('--vocl-primary-hover','#'+to(r)+to(g)+to(b));}catch(e){}})();`;
