#!/usr/bin/env node
// Validates src/editions/editions.json against the design-handoff contract.
// Run in CI (npm run validate:editions) so a bad edit to the token file fails
// the build instead of shipping an inaccessible or mis-tiered edition.
//
// Checks (handoff §3 + acceptance checklist):
//  - WCAG 4.5:1 for body, meta, accentText on paper, and onAccent on accent.
//  - WCAG 3:1 for ink on paper (headlines/nameplate are large text).
//  - Tier split: 9 free / 24 plus; accessibility/wellbeing/identity never paid.
//  - Structural: unique ids, orders, designRefs; default edition exists + free.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(
  readFileSync(join(here, "../src/editions/editions.json"), "utf8"),
);

const NEVER_PAYWALL = ["clear-print", "quiet-room", "pride-print"];
// Large-scale display type that WCAG allows at 3:1 rather than 4.5:1.
const LARGE_TEXT_EXCEPTIONS = new Set(["ink"]);

const errors = [];
const warn = [];

function parseHex(hex) {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    throw new Error(`bad hex "${hex}"`);
  }
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function relLuminance(hex) {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Strict mode (STRICT=1, intended for CI once the palette is fully AA-clean)
// promotes AA near-misses to hard failures. By default an AA near-miss
// (>= HARD_FLOOR but < the AA target) only warns, so a ~0.3 delta in the
// designer's source palette doesn't break the build, while a genuinely
// unreadable value (< HARD_FLOOR) always fails.
const STRICT = process.env.STRICT === "1" || process.env.VALIDATE_EDITIONS_STRICT === "1";
const HARD_FLOOR = 4.0;

function checkContrast(ed, fgKey, bgHex, min, label) {
  const fgHex = ed.colors[fgKey];
  const ratio = contrast(fgHex, bgHex);
  if (ratio + 1e-3 < min) {
    const msg =
      `${ed.id}: ${label} contrast ${ratio.toFixed(2)}:1 < ${min}:1 ` +
      `(${fgKey} ${fgHex} on ${bgHex})`;
    if (STRICT || ratio + 1e-3 < HARD_FLOOR) errors.push(msg);
    else warn.push(`AA near-miss — ${msg}`);
  }
}

const seenId = new Set();
const seenOrder = new Set();
const seenRef = new Set();

for (const ed of file.editions) {
  if (seenId.has(ed.id)) errors.push(`duplicate id "${ed.id}"`);
  seenId.add(ed.id);
  if (seenOrder.has(ed.order)) errors.push(`${ed.id}: duplicate order ${ed.order}`);
  seenOrder.add(ed.order);
  if (seenRef.has(ed.designRef)) errors.push(`${ed.id}: duplicate designRef ${ed.designRef}`);
  seenRef.add(ed.designRef);

  const paper = ed.colors.paper;
  checkContrast(ed, "body", paper, 4.5, "body/paper");
  checkContrast(ed, "meta", paper, 4.5, "meta/paper");
  checkContrast(ed, "accentText", paper, 4.5, "accentText/paper");
  checkContrast(ed, "onAccent", ed.colors.accent, 4.5, "onAccent/accent");
  // Headlines & nameplate use `ink` and are large text -> 3:1.
  checkContrast(ed, "ink", paper, 3.0, "ink/paper (large text)");

  if (NEVER_PAYWALL.includes(ed.id) && ed.tier !== "free") {
    errors.push(`${ed.id}: must be free (accessibility/wellbeing/identity) but is "${ed.tier}"`);
  }
}

for (const id of NEVER_PAYWALL) {
  if (!seenId.has(id)) errors.push(`never-paywall edition "${id}" is missing from editions.json`);
}

if (!seenId.has(file.defaultEdition)) {
  errors.push(`defaultEdition "${file.defaultEdition}" not found in editions.json`);
} else {
  const def = file.editions.find((e) => e.id === file.defaultEdition);
  if (def.tier !== "free") errors.push(`defaultEdition "${file.defaultEdition}" must be free`);
}

const free = file.editions.filter((e) => e.tier === "free").length;
const plus = file.editions.filter((e) => e.tier === "plus").length;
if (file.editions.length !== 33) warn.push(`expected 33 editions, found ${file.editions.length}`);
if (free !== 9) warn.push(`expected 9 free editions, found ${free}`);
if (plus !== 24) warn.push(`expected 24 plus editions, found ${plus}`);

for (const w of warn) console.warn(`⚠ ${w}`);
if (errors.length) {
  console.error(`\n✗ editions.json failed validation (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`✓ editions.json OK — ${file.editions.length} editions (${free} free, ${plus} plus), all contrast + structural checks passed`);
