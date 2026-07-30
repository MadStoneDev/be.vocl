// Projected publish times for queued posts, derived from the user's queue
// window + posts-per-day. Mirrors the calendar's slot maths so the list view
// and the calendar agree on when each post goes out.

export interface QueueTimingSettings {
  postsPerDay: number;
  windowStart: string; // "HH:MM"
  windowEnd: string; // "HH:MM"
}

/**
 * Returns a map of queued-post id → projected publish Date, in queue order.
 * Posts flow into the next open slot each day; when a day fills up, they roll
 * to the next day.
 */
export function computeQueuedTimes<T extends { id: string; queuePosition: number }>(
  posts: T[],
  settings: QueueTimingSettings,
  now: Date = new Date(),
): Map<string, Date> {
  const map = new Map<string, Date>();
  if (posts.length === 0 || settings.postsPerDay <= 0) return map;

  const [startH, startM] = settings.windowStart.split(":").map(Number);
  const [endH, endM] = settings.windowEnd.split(":").map(Number);
  const windowStartMinutes = startH * 60 + startM;
  const windowEndMinutes = endH * 60 + endM;
  const windowDuration = windowEndMinutes - windowStartMinutes;
  if (windowDuration <= 0) return map;

  const interval =
    settings.postsPerDay === 1 ? 0 : windowDuration / (settings.postsPerDay - 1);

  const sorted = [...posts].sort((a, b) => a.queuePosition - b.queuePosition);

  let currentDay = new Date(now);
  currentDay.setHours(0, 0, 0, 0);
  let slotIndexForDay = 0;

  for (const post of sorted) {
    let found = false;
    while (!found) {
      const slotMinutes =
        interval === 0
          ? windowStartMinutes + windowDuration / 2
          : windowStartMinutes + Math.round(interval * slotIndexForDay);

      if (slotMinutes > windowEndMinutes || slotIndexForDay >= settings.postsPerDay) {
        currentDay = new Date(currentDay);
        currentDay.setDate(currentDay.getDate() + 1);
        slotIndexForDay = 0;
        continue;
      }

      const slotTime = new Date(currentDay);
      slotTime.setMinutes(Math.floor(slotMinutes % 60));
      slotTime.setHours(Math.floor(slotMinutes / 60));

      if (slotTime <= now) {
        slotIndexForDay++;
        continue;
      }

      map.set(post.id, slotTime);
      slotIndexForDay++;
      found = true;
    }
  }

  return map;
}

/** "Today 2:30 PM", "Tomorrow 9:00 AM", or "Mon, 3 Jun 2:30 PM". */
export function formatQueueSlot(date: Date, now: Date = new Date()): string {
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (new Date(date).setHours(0, 0, 0, 0) - startOfToday.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return `Today ${time}`;
  if (dayDiff === 1) return `Tomorrow ${time}`;
  const day = date.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${day} · ${time}`;
}
