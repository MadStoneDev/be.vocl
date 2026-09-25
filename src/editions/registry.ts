// Runtime registry over editions.json. Import from here (not the raw JSON) so
// callers get typed access and the shared lookups. Pure data + helpers only —
// no entitlement logic lives here (see resolveEdition on the server for that).

import editionsFile from "./editions.json";
import type { Edition, EditionsFile } from "./types";

const file = editionsFile as EditionsFile;

export const EDITIONS_VERSION = file.version;

/**
 * Master switch for the be.vocl Plus theme paywall.
 *
 * OFF (current): every edition is free to everyone — no PLUS tags, no gating, no
 * upgrade sheet. The paywall machinery (entitlements table, resolveEdition, the
 * Paddle webhook, PlusUpgradeSheet) all stays in place but dormant.
 *
 * To re-enable the paywall later, flip this to true (and configure a processor +
 * NEXT_PUBLIC_PADDLE_PLUS_PRICE_ID, or point resolveEdition/the webhook at a
 * different processor). The `tier` metadata on each edition is preserved so the
 * free/Plus split is ready the moment this is turned back on.
 */
export const EDITIONS_PAYWALL_ENABLED = false;

/** House default. Also the fallback for unknown/retired/unentitled editions. */
export const DEFAULT_EDITION_ID = file.defaultEdition;

/** All editions, sorted by picker order. Includes retired ones (kept for users who have them). */
export const EDITIONS: Edition[] = [...file.editions].sort(
  (a, b) => a.order - b.order,
);

const EDITIONS_BY_ID = new Map<string, Edition>(
  EDITIONS.map((e) => [e.id, e]),
);

export function getEdition(id: string | null | undefined): Edition | undefined {
  if (!id) return undefined;
  return EDITIONS_BY_ID.get(id);
}

/** The default edition, guaranteed to exist. */
export function getDefaultEdition(): Edition {
  const d = EDITIONS_BY_ID.get(DEFAULT_EDITION_ID);
  if (!d) throw new Error(`Default edition "${DEFAULT_EDITION_ID}" missing from editions.json`);
  return d;
}

export function isKnownEdition(id: string | null | undefined): boolean {
  return !!id && EDITIONS_BY_ID.has(id);
}

/** True for a Plus (paid) edition. Unknown ids are treated as not-Plus (they fall back to default anyway). */
export function isPlusEdition(id: string | null | undefined): boolean {
  return getEdition(id)?.tier === "plus";
}

/** Editions shown in the picker (retired ones are hidden but still render for holders). */
export const PICKER_EDITIONS: Edition[] = EDITIONS.filter((e) => !e.retired);

export const FREE_EDITIONS: Edition[] = PICKER_EDITIONS.filter(
  (e) => e.tier === "free",
);
export const PLUS_EDITIONS: Edition[] = PICKER_EDITIONS.filter(
  (e) => e.tier === "plus",
);

export const FREE_EDITION_IDS: ReadonlySet<string> = new Set(
  EDITIONS.filter((e) => e.tier === "free").map((e) => e.id),
);

/**
 * Editions that must never be paywalled regardless of future retiering:
 * accessibility, wellbeing and identity. Referenced by the entitlement tests
 * (handoff §3) so a bad edit to editions.json fails CI rather than shipping.
 */
export const NEVER_PAYWALL_EDITION_IDS: readonly string[] = [
  "clear-print", // accessibility
  "quiet-room", // wellbeing / low-stimulation
  "pride-print", // identity
];
