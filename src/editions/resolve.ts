// Pure edition resolution — the single source of truth for "which edition does
// this reader actually get?" No DB access, so it is unit-testable and usable on
// both server and client. The server calls it with the caller's real Plus
// entitlement; clients must not decide tiers themselves (handoff §3).

import {
  getEdition,
  DEFAULT_EDITION_ID,
  NEVER_PAYWALL_EDITION_IDS,
  EDITIONS_PAYWALL_ENABLED,
} from "./registry";

export interface ResolvedEdition {
  /** The edition id that should actually render. */
  id: string;
  /**
   * True when the preferred edition was downgraded to the default because it is
   * Plus and the user isn't entitled (drives the "your Plus editions ended"
   * messaging). Unknown/retired ids resolve to the default WITHOUT this flag.
   */
  downgraded: boolean;
}

/**
 * Resolve a preferred edition against a Plus entitlement.
 *  - Free editions and the never-paywall set (accessibility/wellbeing/identity)
 *    always render.
 *  - Plus editions render only when `entitled`; otherwise fall back to the
 *    house default and mark `downgraded`.
 *  - Unknown or removed ids fall back to the default silently.
 */
export function resolveEdition(
  preferredId: string | null | undefined,
  opts: { entitled: boolean },
): ResolvedEdition {
  const edition = getEdition(preferredId);
  if (!edition) return { id: DEFAULT_EDITION_ID, downgraded: false };

  // Paywall off: every edition is free to everyone.
  if (!EDITIONS_PAYWALL_ENABLED) return { id: edition.id, downgraded: false };

  const alwaysAllowed =
    edition.tier === "free" || NEVER_PAYWALL_EDITION_IDS.includes(edition.id);
  if (alwaysAllowed) return { id: edition.id, downgraded: false };

  if (opts.entitled) return { id: edition.id, downgraded: false };
  return { id: DEFAULT_EDITION_ID, downgraded: true };
}
