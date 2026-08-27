import { ROLES } from "@/constants/roles";

/**
 * Beta-access gate — SERVER ONLY (env var must not reach the client).
 *
 * The gate is enabled only on a deployment that sets BETA_ACCESS_REQUIRED (the
 * beta environment on Coolify). When enabled, only admins or users with
 * profiles.beta_access = true may use the app; everyone else is sent to
 * /beta-closed. On the live deployment the var is unset, so the gate is off and
 * everyone is allowed in.
 */
export function isBetaGateEnabled(): boolean {
  const v = process.env.BETA_ACCESS_REQUIRED;
  return !!(v && v.trim() && v.trim().toLowerCase() !== "false");
}

/**
 * Whether a profile may use the app while the beta gate is active. Admins are
 * always allowed (with or without beta_access); everyone else needs the flag.
 */
export function canAccessBeta(
  role: number | null | undefined,
  betaAccess: boolean | null | undefined
): boolean {
  return (role ?? 0) >= ROLES.ADMIN || betaAccess === true;
}
