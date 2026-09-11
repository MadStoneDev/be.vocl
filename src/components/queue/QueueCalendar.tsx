"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconRepeat,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconNote,
} from "@tabler/icons-react";
import { useState, useMemo } from "react";

interface QueuePost {
  id: string;
  queuePosition: number;
  postType?: string;
  content?: any;
  isSensitive?: boolean;
  createdAt?: string;
  reblogCommentHtml?: string;
  originalPost?: {
    id: string;
    postType?: string;
    content: any;
    author: {
      username: string;
      avatarUrl?: string;
    };
  };
}

interface ScheduledPost {
  id: string;
  scheduled_for: string;
  content?: any;
  reblog_comment_html?: string;
  original_post?: {
    id: string;
    content: any;
    profiles?: {
      username: string;
      avatar_url?: string;
    };
  };
}

interface QueueSettings {
  enabled: boolean;
  paused: boolean;
  postsPerDay: number;
  windowStart: string;
  windowEnd: string;
}

interface QueueCalendarProps {
  posts: QueuePost[];
  scheduledPosts: ScheduledPost[];
  settings: QueueSettings;
}

interface CalendarSlot {
  type: "queued" | "scheduled";
  post: QueuePost | ScheduledPost;
  time: Date;
}

function getPostTypeIcon(content: any) {
  if (!content) return IconRepeat;
  if (content.video_url) return IconVideo;
  if (content.audio_url) return IconMusic;
  if (content.media_urls?.length || content.image_url) return IconPhoto;
  if (content.text) return IconNote;
  return IconRepeat;
}

function getPostPreview(post: QueuePost | ScheduledPost): string {
  if ("originalPost" in post && post.originalPost) {
    if (post.originalPost.content?.text) {
      return post.originalPost.content.text.slice(0, 60);
    }
    return `Echo from @${post.originalPost.author.username}`;
  }
  if ("original_post" in post && post.original_post) {
    if (post.original_post.content?.text) {
      return post.original_post.content.text.slice(0, 60);
    }
    return `Echo from @${post.original_post.profiles?.username || "unknown"}`;
  }
  if ("content" in post && post.content?.text) {
    return post.content.text.slice(0, 60);
  }
  return "Queued post";
}

function getPostContent(post: QueuePost | ScheduledPost): any {
  if ("originalPost" in post && post.originalPost) return post.originalPost.content;
  if ("original_post" in post && post.original_post) return post.original_post.content;
  if ("content" in post) return post.content;
  return null;
}

/** Canonical daily slot times (the cell model) derived from the schedule
 *  window + posts-per-day. These are the rows of the time-gutter grid. */
function computeSlotTimes(settings: QueueSettings): { minutes: number; label: string }[] {
  const [sH, sM] = settings.windowStart.split(":").map(Number);
  const [eH, eM] = settings.windowEnd.split(":").map(Number);
  const start = sH * 60 + sM;
  const end = eH * 60 + eM;
  const n = Math.max(1, settings.postsPerDay || 1);
  const out: { minutes: number; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const m =
      n === 1
        ? Math.round((start + end) / 2)
        : Math.round(start + ((end - start) * i) / (n - 1));
    out.push({ minutes: m, label: fmtMinutes(m) });
  }
  return out;
}

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/** Calculate the publish times for queued posts based on settings. */
function calculateQueuedSlots(posts: QueuePost[], settings: QueueSettings): CalendarSlot[] {
  if (posts.length === 0 || settings.postsPerDay <= 0) return [];

  const now = new Date();
  const slots: CalendarSlot[] = [];
  const sorted = [...posts].sort((a, b) => a.queuePosition - b.queuePosition);

  const [startH, startM] = settings.windowStart.split(":").map(Number);
  const [endH, endM] = settings.windowEnd.split(":").map(Number);
  const windowStartMinutes = startH * 60 + startM;
  const windowEndMinutes = endH * 60 + endM;
  const windowDuration = windowEndMinutes - windowStartMinutes;
  if (windowDuration <= 0) return [];

  const interval =
    settings.postsPerDay === 1 ? 0 : windowDuration / (settings.postsPerDay - 1);

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
      slotTime.setHours(Math.floor(slotMinutes / 60));
      slotTime.setMinutes(Math.floor(slotMinutes % 60), 0, 0);

      if (slotTime <= now) {
        slotIndexForDay++;
        continue;
      }

      slots.push({ type: "queued", post, time: slotTime });
      slotIndexForDay++;
      found = true;
    }
  }

  return slots;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function slotKey(s: CalendarSlot): string {
  return `${s.type}-${"id" in s.post ? s.post.id : "x"}-${s.time.getTime()}`;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function QueueCalendar({ posts, scheduledPosts, settings }: QueueCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + weekOffset * 7 + i);
      result.push(d);
    }
    return result;
  }, [today, weekOffset]);

  const slotTimes = useMemo(() => computeSlotTimes(settings), [settings]);

  const queuedSlots = useMemo(
    () => calculateQueuedSlots(posts, settings),
    [posts, settings]
  );

  const scheduledSlots: CalendarSlot[] = useMemo(
    () =>
      scheduledPosts.map((sp) => ({
        type: "scheduled" as const,
        post: sp,
        time: new Date(sp.scheduled_for),
      })),
    [scheduledPosts]
  );

  const allSlots = useMemo(
    () =>
      [...queuedSlots, ...scheduledSlots].sort(
        (a, b) => a.time.getTime() - b.time.getTime()
      ),
    [queuedSlots, scheduledSlots]
  );

  // Next out = earliest queued entry (position #1).
  const nextOutKey = queuedSlots.length > 0 ? slotKey(queuedSlots[0]) : null;

  // Bucket entries into (dayKey | slotRow) cells by nearest canonical slot.
  const nearestSlotIndex = (d: Date): number => {
    const mins = d.getHours() * 60 + d.getMinutes();
    let best = 0;
    let bestDist = Infinity;
    slotTimes.forEach((s, i) => {
      const dist = Math.abs(s.minutes - mins);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    return best;
  };

  const cells = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const slot of allSlots) {
      const inWeek = days.some((d) => isSameDay(d, slot.time));
      if (!inWeek) continue;
      const key = `${slot.time.toDateString()}|${nearestSlotIndex(slot.time)}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allSlots, days, slotTimes]);

  const selected =
    allSlots.find((s) => slotKey(s) === selectedKey) ??
    (nextOutKey ? queuedSlots[0] : allSlots[0] ?? null);

  const weekStart = days[0];
  const weekEnd = days[6];
  const headerLabel = `${MONTH_NAMES[weekStart.getMonth()].slice(0, 3)} ${weekStart.getDate()} — ${MONTH_NAMES[weekEnd.getMonth()].slice(0, 3)} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  // Month mini-calendar ticks (today's month), Monday-start.
  const monthGrid = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const marksByDay = new Map<number, string[]>();
    for (const slot of allSlots) {
      if (slot.time.getFullYear() === year && slot.time.getMonth() === month) {
        const dnum = slot.time.getDate();
        const arr = marksByDay.get(dnum) || [];
        if (arr.length < 3) {
          arr.push(slot.type === "scheduled" ? "bg-ink" : "bg-meta");
          marksByDay.set(dnum, arr);
        }
      }
    }
    const out: { n: number | null; isToday: boolean; marks: string[] }[] = [];
    for (let i = 0; i < startWeekday; i++) out.push({ n: null, isToday: false, marks: [] });
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({
        n: d,
        isToday: d === today.getDate(),
        marks: marksByDay.get(d) || [],
      });
    }
    return { month, year, cells: out };
  }, [today, allSlots]);

  const tz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "—";
    }
  }, []);

  const chipClasses = (slot: CalendarSlot): string => {
    if (slot.type === "scheduled") return "border-t-2 border-foreground";
    if (slotKey(slot) === nextOutKey) return "border-t-2 border-accent border-dashed";
    return "border-t border-dashed border-meta-dim";
  };

  const statusLine = (slot: CalendarSlot): string => {
    if (slot.type === "scheduled") return `${formatTime(slot.time)} SHARP · SCHEDULED`;
    const pos = (slot.post as QueuePost).queuePosition;
    if (slotKey(slot) === nextOutKey) return `~${formatTime(slot.time)} · NEXT OUT`;
    return `~${formatTime(slot.time)} · QUEUED${pos ? ` #${pos}` : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Navigation + legend */}
      <div className="flex items-center gap-6 flex-wrap py-3 border-t border-b border-rule">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          className="slug text-meta hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1"
        >
          <IconChevronLeft size={14} /> Prev week
        </button>
        <span className="font-display text-xl text-ink">{headerLabel}</span>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="slug text-meta hover:text-ink transition-colors inline-flex items-center gap-1"
        >
          Next week <IconChevronRight size={14} />
        </button>
        <span className="ml-auto hidden lg:flex items-center gap-4 slug text-meta">
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t-2 border-accent border-dashed" /> Next out</span>
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t-2 border-foreground" /> Scheduled</span>
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t border-dashed border-meta-dim" /> Queued</span>
        </span>
      </div>

      {/* Time-gutter grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px] border-t border-l border-rule">
          {/* Day header row */}
          <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
            <div className="border-r border-b border-rule" />
            {days.map((day) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toDateString()}
                  className={`border-r border-b border-rule px-2.5 py-2 ${
                    isToday ? "border-t-2 border-t-accent" : ""
                  }`}
                >
                  <div className={`slug ${isToday ? "text-accent" : "text-meta"}`}>
                    {DAY_NAMES[day.getDay()]}
                    {isToday ? " · Today" : ""}
                  </div>
                  <div
                    className={`font-display text-xl leading-none mt-1 ${
                      isToday ? "text-ink" : "text-meta"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {slotTimes.map((slotTime, rowIdx) => (
            <div
              key={slotTime.label}
              className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]"
            >
              <div className="border-r border-b border-rule px-2 py-3 text-right font-mono text-[10px] tracking-[0.14em] text-meta-dim">
                {slotTime.label}
              </div>
              {days.map((day) => {
                const key = `${day.toDateString()}|${rowIdx}`;
                const entries = cells.get(key) || [];
                const isToday = isSameDay(day, today);
                return (
                  <div
                    key={key}
                    className={`border-r border-b border-rule p-2 min-h-[92px] align-top ${
                      isToday ? "bg-panel" : ""
                    }`}
                  >
                    {entries.length === 0 ? (
                      <div className="pt-1.5 border-t border-dashed border-rule text-center font-mono text-[9.5px] tracking-[0.14em] text-meta-dim leading-relaxed">
                        EMPTY SLOT
                        <br />
                        <span className="text-ink">+ FILL</span>
                      </div>
                    ) : (
                      entries.map((slot) => {
                        const Icon = getPostTypeIcon(getPostContent(slot.post));
                        const isSel = slotKey(slot) === (selected ? slotKey(selected) : null);
                        return (
                          <button
                            key={slotKey(slot)}
                            type="button"
                            onClick={() => setSelectedKey(slotKey(slot))}
                            className={`w-full text-left pt-1.5 mb-2 last:mb-0 ${chipClasses(slot)} ${
                              isSel ? "opacity-100" : "opacity-90 hover:opacity-100"
                            } transition-opacity`}
                          >
                            <div
                              className={`font-mono text-[9px] tracking-[0.14em] mb-1 ${
                                slot.type === "scheduled"
                                  ? "text-ink"
                                  : slotKey(slot) === nextOutKey
                                    ? "text-accent"
                                    : "text-meta"
                              }`}
                            >
                              {statusLine(slot)}
                            </div>
                            <div className="font-display text-[13px] leading-tight text-ink line-clamp-2 flex items-start gap-1.5">
                              <Icon size={12} className="shrink-0 mt-0.5 text-meta" />
                              <span className="min-w-0">{getPostPreview(slot.post)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer trio */}
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* Selected entry */}
        <div className="lg:pr-8">
          <div className="slug text-meta border-b border-rule pb-2.5">Selected entry</div>
          {selected ? (
            <div className="pt-3.5">
              <div
                className={`font-mono text-[9.5px] tracking-[0.14em] mb-1.5 ${
                  selected.type === "queued" && slotKey(selected) === nextOutKey
                    ? "text-accent"
                    : "text-meta"
                }`}
              >
                {statusLine(selected)}
              </div>
              <h3 className="type-heading text-ink mb-2 line-clamp-2">
                {getPostPreview(selected.post)}
              </h3>
              <p className="editorial-body text-meta mb-3.5 line-clamp-3">
                {getPostPreview(selected.post)}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-2 py-3 border-t border-b border-rule slug text-meta">
                <span>Publish now</span>
                <span>Move up</span>
                <span>Pin to time</span>
                <span>Edit</span>
                <span>Remove</span>
              </div>
            </div>
          ) : (
            <p className="editorial-body text-meta pt-3.5">Nothing scheduled or queued.</p>
          )}
        </div>

        {/* Schedule settings */}
        <div className="lg:px-8 lg:border-l border-rule mt-8 lg:mt-0">
          <div className="slug text-meta border-b border-rule pb-2.5">Schedule settings</div>
          <div className="pt-1">
            {[
              { k: "Posts per day", v: String(settings.postsPerDay) },
              { k: "Queue slots", v: slotTimes.map((s) => s.label).join(" · "), mono: true },
              { k: "Window", v: `${settings.windowStart}–${settings.windowEnd}`, mono: true },
              { k: "Timezone", v: tz },
              { k: "Status", v: settings.paused ? "Paused" : settings.enabled ? "Active" : "Off" },
            ].map((row) => (
              <div
                key={row.k}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-rule text-sm"
              >
                <span className="text-meta">{row.k}</span>
                <span className={row.mono ? "font-mono text-xs text-ink" : "text-ink"}>{row.v}</span>
              </div>
            ))}
            <p className="editorial-caption not-italic text-meta mt-3">
              Queued posts fill these slots in order; adding one pushes the rest down.
              Scheduled posts never move.
            </p>
          </div>
        </div>

        {/* Month mini-calendar */}
        <div className="lg:pl-8 lg:border-l border-rule mt-8 lg:mt-0">
          <div className="flex items-baseline justify-between border-b border-rule pb-2.5">
            <span className="slug text-meta">{MONTH_NAMES[monthGrid.month]}</span>
            <span className="font-mono text-[9.5px] text-meta-dim">MONTH VIEW</span>
          </div>
          <div className="grid grid-cols-7 gap-px bg-rule border border-rule mt-3">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <div
                key={i}
                className="bg-background py-1.5 text-center font-mono text-[8.5px] text-meta-dim"
              >
                {d}
              </div>
            ))}
            {monthGrid.cells.map((c, i) => (
              <div key={i} className="bg-background px-1 pt-1.5 pb-2 min-h-[38px]">
                <div
                  className={`font-mono text-[9.5px] ${
                    c.isToday ? "text-accent" : c.n ? "text-meta" : "text-transparent"
                  }`}
                >
                  {c.n ?? ""}
                </div>
                <div className="flex gap-0.5 mt-1.5">
                  {(c.isToday ? ["bg-accent", ...c.marks] : c.marks).slice(0, 3).map((m, j) => (
                    <span key={j} className={`h-0.5 flex-1 ${m}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="font-mono text-[9px] leading-relaxed text-meta-dim mt-3">
            TICKS = ENTRIES PER DAY
            <br />
            INK = SCHEDULED · GREY = QUEUED · ACCENT = TODAY
          </p>
        </div>
      </div>
    </div>
  );
}
