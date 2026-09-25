// Editions — user-selectable themes ("different printings of the same paper").
// An edition swaps TOKENS ONLY: colours, fonts, type treatments, rule styles,
// paper texture. Layout, grid, spacing, component structure and behaviour never
// change. See the design handoff (Handoff: be.vocl — Editions) for the contract.
//
// `editions.json` is the source of truth for the token values and is generated
// from the design file. Do not hand-edit hex values here — edit the JSON.

export type EditionGroup =
  | "house"
  | "genre"
  | "scene"
  | "audience"
  | "community";

export type EditionTier = "free" | "plus";

export interface EditionColors {
  paper: string; // page background
  ink: string; // headlines, primary text, secondary-button border
  body: string; // serif/body copy, bios, decks
  meta: string; // bylines, timestamps, labels, inactive tabs
  rule: string; // hairlines, poll track
  accent: string; // FILLS ONLY: primary button bg, active-tab underline, poll leading bar
  accentText: string; // accent used AS TEXT: kickers, wordmark, glyphs (>=4.5:1 on paper)
  onAccent: string; // text colour on an accent fill (primary button label)
  placeholderStripeA: string; // striped image placeholder
  placeholderStripeB: string;
}

export interface EditionFonts {
  nameplate: string; // profile display name + desk name (the big one)
  headline: string; // post headlines, stat numerals, h2/h3/h4, poll question
  body: string; // post body, bios, decks, briefs
  ui: string; // nav, tabs, bylines, buttons, kickers, labels
}

export interface EditionType {
  nameplateSizePx: number; // at 600px specimen width; scale per handoff §1
  nameplateWeight: number;
  headlineWeight: number;
  nameplateCase: "none" | "uppercase";
  nameplateTracking: string;
  nameplateItalic: boolean;
  headlineCase: "none" | "uppercase";
  headlineItalic: boolean;
  bodyScale: number; // multiply every body/serif size in the base type scale
  bodyItalicAllowed: boolean; // false => decks/bios/captions set roman, never italic
  uiCase: "none" | "uppercase"; // 'none' => small-caps or roman fonts carry the meta layer
  uiTracking: string | null; // null = keep base tracking per role
  uiScale: number; // multiply every UI/meta size
}

export interface EditionRules {
  hairline: string; // always `1px solid ${rule}`
  sectionBreak: string; // replaces the base `3px double rule`
  sectionBreakImage: string | null; // Pride Print only: border-image for the section break
}

export interface EditionEffects {
  texture: string | null; // CSS background-image layered over paper
  nameplateTextShadow: string | null; // Terminal (glow), Riso (misregistration) only
  headlineTextShadow: string | null; // Riso only
  buttonBorder: string | null; // Photocopy only (2px ink border on primary button)
}

export interface Edition {
  id: string; // stable slug, e.g. "late-edition". Never rename; stored on users.
  designRef: string; // "1a".."3g" => badge in the reference file
  name: string; // display name
  group: EditionGroup;
  audience: string; // short "for who" label shown in the picker
  tier: EditionTier;
  order: number; // picker sort order within the full list
  colors: EditionColors;
  fonts: EditionFonts;
  type: EditionType;
  rules: EditionRules;
  effects: EditionEffects;
  sampleMastheadLine: string; // example copy only — see handoff §5
  description: string; // picker blurb
  fontsSummary: string; // picker meta line
  /**
   * Retired editions stay in the registry so users who already have them keep
   * rendering, but they are hidden from the picker. Edition IDs are permanent.
   */
  retired?: boolean;
}

export interface EditionsFile {
  version: number;
  defaultEdition: string;
  editions: Edition[];
}
