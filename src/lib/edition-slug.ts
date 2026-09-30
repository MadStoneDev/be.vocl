// Single source for the front-page "edition" slug so the homepage header, the
// footer and the auth pages never drift apart. The edition number is the
// day-of-year (a fresh printing each day); the dateline is a long en-AU date.

/** Zero-padded day-of-year, e.g. "0273" for 30 Sep. */
export function editionNumber(date: Date = new Date()): string {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor(
    (date.getTime() - startOfYear.getTime()) / 86_400_000,
  );
  return String(dayOfYear).padStart(4, "0");
}

/** Long dateline, e.g. "Wednesday 30 September 2026" (en-AU). */
export function editionDateline(date: Date = new Date()): string {
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
