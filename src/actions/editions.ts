"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getEdition,
  isPlusEdition,
  NEVER_PAYWALL_EDITION_IDS,
  DEFAULT_EDITION_ID,
  EDITIONS_PAYWALL_ENABLED,
} from "@/editions/registry";
import { resolveEdition } from "@/editions/resolve";
import { hasPlus } from "@/lib/entitlements";

export interface MyAppearance {
  readingEdition: string;
  profileEdition: string;
  readingEditionLight: string | null;
  readingEditionDark: string | null;
  matchSystemTheme: boolean;
  paperTexture: boolean;
  alwaysReadInMyEdition: boolean;
  customNameplateFont: string | null;
  mastheadLine: string | null;
  accentColor: string | null;
  isPlus: boolean;
  /** Reading edition after entitlement resolution — what should actually render. */
  resolvedReadingEdition: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
  /** Set when Apply hit a Plus edition without entitlement — client opens the upgrade sheet. */
  plusRequired?: boolean;
  editionId?: string;
}

/** Read the signed-in user's appearance settings + Plus status for the picker. */
export async function getMyAppearance(): Promise<{
  success: boolean;
  appearance?: MyAppearance;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "reading_edition, profile_edition, reading_edition_light, reading_edition_dark, match_system_theme, paper_texture, always_read_in_my_edition, custom_nameplate_font, masthead_line, accent_color",
    )
    .eq("id", user.id)
    .single();

  // Paywall off: treat everyone as entitled so nothing gates or downgrades.
  const isPlus = EDITIONS_PAYWALL_ENABLED ? await hasPlus(supabase, user.id) : true;
  const readingPref = profile?.reading_edition ?? DEFAULT_EDITION_ID;

  return {
    success: true,
    appearance: {
      readingEdition: readingPref,
      profileEdition: profile?.profile_edition ?? DEFAULT_EDITION_ID,
      readingEditionLight: profile?.reading_edition_light ?? null,
      readingEditionDark: profile?.reading_edition_dark ?? null,
      matchSystemTheme: profile?.match_system_theme ?? false,
      paperTexture: profile?.paper_texture ?? true,
      alwaysReadInMyEdition: profile?.always_read_in_my_edition ?? false,
      customNameplateFont: profile?.custom_nameplate_font ?? null,
      mastheadLine: profile?.masthead_line ?? null,
      accentColor: profile?.accent_color ?? null,
      isPlus,
      resolvedReadingEdition: resolveEdition(readingPref, { entitled: isPlus }).id,
    },
  };
}

/** Shared Apply-time gate: a Plus edition requires entitlement (never-paywall exempt). */
async function gateEdition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  editionId: string,
): Promise<ActionResult | null> {
  const edition = getEdition(editionId);
  if (!edition) return { success: false, error: "Unknown edition" };
  // Paywall off: every edition applies for everyone.
  if (!EDITIONS_PAYWALL_ENABLED) return null;
  const gated =
    isPlusEdition(editionId) && !NEVER_PAYWALL_EDITION_IDS.includes(editionId);
  if (gated) {
    const entitled = await hasPlus(supabase, userId);
    if (!entitled) {
      return { success: false, plusRequired: true, editionId };
    }
  }
  return null; // allowed
}

export async function updateReadingEdition(editionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const gate = await gateEdition(supabase, user.id, editionId);
  if (gate) return gate;

  const { error } = await supabase
    .from("profiles")
    .update({ reading_edition: editionId })
    .eq("id", user.id);
  if (error) return { success: false, error: "Failed to save edition" };
  return { success: true };
}

export async function updateProfileEdition(editionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };

  const gate = await gateEdition(supabase, user.id, editionId);
  if (gate) return gate;

  const { error } = await supabase
    .from("profiles")
    .update({ profile_edition: editionId })
    .eq("id", user.id);
  if (error) return { success: false, error: "Failed to save edition" };
  return { success: true };
}

export async function updatePaperTexture(on: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { error } = await supabase
    .from("profiles")
    .update({ paper_texture: on })
    .eq("id", user.id);
  if (error) return { success: false, error: "Failed to save" };
  return { success: true };
}

/**
 * Context for opening the Plus checkout: the user id to stamp into Paddle
 * custom_data (the subscription.* webhook grants the entitlement keyed on it)
 * and whether they're already entitled.
 */
export async function getPlusCheckoutInfo(): Promise<{
  success: boolean;
  userId?: string;
  alreadyPlus?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const alreadyPlus = await hasPlus(supabase, user.id);
  return { success: true, userId: user.id, alreadyPlus };
}

export async function updateAlwaysReadInMyEdition(on: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized" };
  const { error } = await supabase
    .from("profiles")
    .update({ always_read_in_my_edition: on })
    .eq("id", user.id);
  if (error) return { success: false, error: "Failed to save" };
  return { success: true };
}
