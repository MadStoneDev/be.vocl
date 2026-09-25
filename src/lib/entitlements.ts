// Server-side entitlement checks against the processor-agnostic `entitlements`
// table (see supabase/migrations/20260925_plus_entitlements.sql).
//
// Entitlement is deliberately decoupled from any one processor: a row is
// "active" whether Paddle, an adult-friendly PSP, or a comp/grant created it.

import type { SupabaseClient } from "@supabase/supabase-js";

export const PRODUCT_PLUS = "plus";

/** How long Plus editions keep rendering after a subscription lapses (handoff §3). */
export const PLUS_GRACE_DAYS = 14;

type Client = SupabaseClient<any, any, any>;

/**
 * Is this user currently entitled to `product`? Active subscriptions count; so
 * do canceled/past_due ones still inside their grace window (expires_at in the
 * future). Everything else is not entitled.
 */
export async function hasEntitlement(
  supabase: Client,
  userId: string,
  product: string = PRODUCT_PLUS,
): Promise<boolean> {
  if (!userId) return false;
  const { data, error } = await supabase
    .from("entitlements")
    .select("status, expires_at")
    .eq("user_id", userId)
    .eq("product", product)
    .maybeSingle();

  if (error || !data) return false;

  const notExpired =
    !data.expires_at || new Date(data.expires_at).getTime() > Date.now();

  if (data.status === "active") return notExpired || !data.expires_at;
  // Grace: a lapsed sub still entitles while inside its grace window.
  if (data.status === "canceled" || data.status === "past_due") return notExpired;
  return false;
}

/** Convenience wrapper for the Plus product. */
export function hasPlus(supabase: Client, userId: string): Promise<boolean> {
  return hasEntitlement(supabase, userId, PRODUCT_PLUS);
}
