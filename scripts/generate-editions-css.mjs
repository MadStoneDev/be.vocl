#!/usr/bin/env node
// Generates src/app/editions.generated.css from src/editions/editions.json.
// One `[data-edition="<id>"]` block per edition, redefining the same CSS custom
// properties the app already themes through (globals.css :root/.dark), so every
// `bg-paper`/`text-ink`/`border-rule`/`text-accent`/`font-*` utility re-skins
// with zero markup changes. Layout/spacing/geometry never change — tokens only.
//
// Run: npm run gen:editions  (also runs in prebuild). Do NOT hand-edit the CSS.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const file = JSON.parse(
  readFileSync(join(root, "src/editions/editions.json"), "utf8"),
);

function relLuminance(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Slugs stay IBM Plex Mono unless the edition's UI font is already monospace
// (Terminal, Wire, Photocopy, Field Notes), per the handoff.
const isMonoUi = (ui) => /mono|courier|vt323/i.test(ui);

function block(ed) {
  const c = ed.colors;
  const dark = relLuminance(c.paper) < 0.35;
  const hover = dark ? "rgba(255,255,255,0.05)" : "rgba(20,18,15,0.04)";
  const hoverStrong = dark ? "rgba(255,255,255,0.10)" : "rgba(20,18,15,0.07)";
  const grain = ed.effects.texture ?? "none";
  const slug = isMonoUi(ed.fonts.ui) ? ed.fonts.ui : "var(--font-plex-mono)";
  const sectionBreakImage = ed.rules.sectionBreakImage
    ? ed.rules.sectionBreakImage
    : "none";

  const lines = [
    `  color-scheme: ${dark ? "dark" : "light"};`,
    `  --paper: ${c.paper};`,
    `  --panel: ${c.placeholderStripeB};`,
    `  --panel-stripe: ${c.placeholderStripeA};`,
    `  --ink: ${c.ink};`,
    `  --ink-secondary: ${c.ink};`,
    `  --editorial-body: ${c.body};`,
    `  --meta: ${c.meta};`,
    `  --meta-dim: ${c.meta};`,
    `  --caption: ${c.meta};`,
    `  --rule: ${c.rule};`,
    `  --accent: ${c.accent};`,
    `  --accent-text: ${c.accentText};`,
    `  --on-accent: ${c.onAccent};`,
    `  --paper-grain: ${grain};`,
    `  --section-break: ${ed.rules.sectionBreak};`,
    `  --section-break-image: ${sectionBreakImage};`,
    `  --vocl-hover: ${hover};`,
    `  --vocl-hover-strong: ${hoverStrong};`,
    `  --vocl-surface-dark: ${c.placeholderStripeB};`,
    `  --font-nameplate: ${ed.fonts.nameplate};`,
    `  --font-headline: ${ed.fonts.headline};`,
    `  --font-body: ${ed.fonts.body};`,
    `  --font-ui: ${ed.fonts.ui};`,
    `  --font-slug: ${slug};`,
  ];
  return `[data-edition="${ed.id}"] {\n${lines.join("\n")}\n}`;
}

const header = `/* GENERATED FILE — do not edit by hand.
   Source: src/editions/editions.json  •  Generator: scripts/generate-editions-css.mjs
   Run \`npm run gen:editions\` to regenerate. Imported after globals.css in
   src/app/layout.tsx so an active edition wins over the base :root/.dark tokens
   on equal specificity. */\n`;

const css =
  header +
  "\n" +
  [...file.editions]
    .sort((a, b) => a.order - b.order)
    .map(block)
    .join("\n\n") +
  "\n";

const out = join(root, "src/app/editions.generated.css");
writeFileSync(out, css, "utf8");
console.log(
  `✓ wrote src/app/editions.generated.css — ${file.editions.length} edition blocks`,
);
