const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Human-readable relative timestamp: "now", "5m", "3h", "2d", then an absolute
 * date ("Jun 19" / "Jun 19, 2025"). Non-date input is returned unchanged so
 * already-formatted strings pass through safely.
 */
export function formatTimeAgo(input: string | number | Date, now: number = Date.now()): string {
  const date = input instanceof Date ? input : new Date(input);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return typeof input === "string" ? input : "";

  const sec = Math.round((now - ms) / 1000);
  if (sec < 45) return "now";
  if (sec < 90) return "1m";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;

  // Older than a week → absolute date (deterministic: built from UTC parts).
  const sameYear = date.getUTCFullYear() === new Date(now).getUTCFullYear();
  const base = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return sameYear ? base : `${base}, ${date.getUTCFullYear()}`;
}

/** Compare two dates by local calendar day. */
function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Calendar-day label for date dividers in the chat thread:
 * "Today" / "Yesterday" / "June 12" / "June 12, 2025".
 */
export function formatDayLabel(input: string | number | Date, now: number = Date.now()): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return typeof input === "string" ? input : "";

  const today = new Date(now);
  if (isSameLocalDay(date, today)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Clock time for a message bubble, e.g. "3:42 PM". */
export function formatClockTime(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return typeof input === "string" ? input : "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** True when two ISO timestamps fall on the same local calendar day. */
export function isSameDay(a: string | number | Date, b: string | number | Date): boolean {
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return isSameLocalDay(da, db);
}
