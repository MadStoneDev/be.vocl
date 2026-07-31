// Age helpers for the DOB-gated sensitive-content feature.

/** Minimum age to view (or enable) sensitive content on be.vocl. */
export const SENSITIVE_MIN_AGE = 21;

/** Full years old from a date of birth, or null if missing/invalid. */
export function ageFromDob(dob: string | Date | null | undefined): number | null {
  if (!dob) return null;
  const d = typeof dob === "string" ? new Date(dob) : dob;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** True if the DOB is present, valid, and indicates at least `years` old. */
export function isAtLeast(dob: string | Date | null | undefined, years: number): boolean {
  const age = ageFromDob(dob);
  return age !== null && age >= years;
}

/** May this DOB view/enable sensitive content? */
export function canViewSensitive(dob: string | Date | null | undefined): boolean {
  return isAtLeast(dob, SENSITIVE_MIN_AGE);
}
