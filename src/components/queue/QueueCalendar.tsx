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
  // QueuePost shape
  if ("originalPost" in post && post.originalPost) {
    if (post.originalPost.content?.text) {
      return post.originalPost.content.text.slice(0, 50);
    }
    return `Echo from @${post.originalPost.author.username}`;
  }
  // ScheduledPost shape
  if ("original_post" in post && post.original_post) {
    if (post.original_post.content?.text) {
      return post.original_post.content.text.slice(0, 50);
    }
    return `Echo from @${post.original_post.profiles?.username || "unknown"}`;
  }
  if ("content" in post && post.content?.text) {
    return post.content.text.slice(0, 50);
  }
  return "Queued post";
}

function getPostContent(post: QueuePost | ScheduledPost): any {
  if ("originalPost" in post && post.originalPost) {
    return post.originalPost.content;
  }
  if ("original_post" in post && post.original_post) {
    return post.original_post.content;
  }
  if ("content" in post) {
    return post.content;
  }
  return null;
}

/** Calculate the publish times for queued posts based on settings. */
function calculateQueuedSlots(
  posts: QueuePost[],
  settings: QueueSettings
): CalendarSlot[] {
  if (posts.length === 0 || settings.postsPerDay <= 0) return [];

  const now = new Date();
  const slots: CalendarSlot[] = [];
  const sorted = [...posts].sort((a, b) => a.queuePosition - b.queuePosition);

  // Parse window start/end hours
  const [startH, startM] = settings.windowStart.split(":").map(Number);
  const [endH, endM] = settings.windowEnd.split(":").map(Number);
  const windowStartMinutes = startH * 60 + startM;
  const windowEndMinutes = endH * 60 + endM;
  const windowDuration = windowEndMinutes - windowStartMinutes;

  if (windowDuration <= 0) return [];

  // Calculate interval between posts in minutes
  const interval =
    settings.postsPerDay === 1
      ? 0
      : windowDuration / (settings.postsPerDay - 1);

  let currentDay = new Date(now);
  currentDay.setHours(0, 0, 0, 0);
  let slotIndexForDay = 0;

  for (const post of sorted) {
    // Find next available slot
    let found = false;
    while (!found) {
      const slotMinutes =
        interval === 0
          ? windowStartMinutes + windowDuration / 2
          : windowStartMinutes + Math.round(interval * slotIndexForDay);

      if (slotMinutes > windowEndMinutes || slotIndexForDay >= settings.postsPerDay) {
        // Move to next day
        currentDay = new Date(currentDay);
        currentDay.setDate(currentDay.getDate() + 1);
        slotIndexForDay = 0;
        continue;
      }

      const slotTime = new Date(currentDay);
      slotTime.setHours(0, Math.floor(slotMinutes), slotMinutes % 1 * 60, 0);
      slotTime.setMinutes(Math.floor(slotMinutes % 60));
      slotTime.setHours(Math.floor(slotMinutes / 60));

      // Skip past slots for today
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

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function QueueCalendar({
  posts,
  scheduledPosts,
  settings,
}: QueueCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate 7 days starting from today + weekOffset*7
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + weekOffset * 7 + i);
      result.push(d);
    }
    return result;
  }, [today, weekOffset]);

  // Calculate queued post slots
  const queuedSlots = useMemo(
    () => calculateQueuedSlots(posts, settings),
    [posts, settings]
  );

  // Convert scheduled posts to slots
  const scheduledSlots: CalendarSlot[] = useMemo(
    () =>
      scheduledPosts.map((sp) => ({
        type: "scheduled" as const,
        post: sp,
        time: new Date(sp.scheduled_for),
      })),
    [scheduledPosts]
  );

  // Combine and group by day
  const allSlots = useMemo(
    () => [...queuedSlots, ...scheduledSlots].sort((a, b) => a.time.getTime() - b.time.getTime()),
    [queuedSlots, scheduledSlots]
  );

  const slotsByDay = useMemo(() => {
    const map = new Map<string, CalendarSlot[]>();
    for (const day of days) {
      const key = day.toDateString();
      map.set(key, []);
    }
    for (const slot of allSlots) {
      const key = slot.time.toDateString();
      if (map.has(key)) {
        map.get(key)!.push(slot);
      }
    }
    return map;
  }, [days, allSlots]);

  const weekStart = days[0];
  const weekEnd = days[6];
  const headerLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${MONTH_NAMES[weekEnd.getMonth()]} ${weekEnd.getDate()}`;

  return (
    <div className="space-y-5">
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
        <span className="ml-auto hidden md:flex items-center gap-4 slug text-meta">
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t-2 border-dashed border-accent" /> Queued</span>
          <span className="inline-flex items-center gap-2"><span className="w-4 border-t-2 border-foreground" /> Scheduled</span>
          <span className="inline-flex items-center gap-2"><span className="w-1.5 h-1.5 bg-accent" /> Today</span>
        </span>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l border-rule">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const daySlots = slotsByDay.get(day.toDateString()) || [];
          return (
            <div
              key={day.toDateString()}
              className={`border-r border-b border-rule p-2 min-h-[150px] flex flex-col ${
                isToday ? "border-t-2 border-t-accent bg-panel" : ""
              }`}
            >
              {/* Day header */}
              <div className="mb-3">
                <div className={`slug ${isToday ? "text-accent" : "text-meta"}`}>
                  {DAY_NAMES[day.getDay()]}
                  {isToday ? " · Today" : ""}
                </div>
                <div
                  className={`font-display text-xl leading-none mt-1 ${
                    isToday ? "text-accent" : "text-meta"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Slots */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[240px] scrollbar-thin">
                {daySlots.map((slot, idx) => {
                  const Icon = getPostTypeIcon(getPostContent(slot.post));
                  const isQueued = slot.type === "queued";
                  return (
                    <div
                      key={`${slot.type}-${"id" in slot.post ? slot.post.id : idx}-${idx}`}
                      className={`pt-1.5 border-t-2 ${
                        isQueued ? "border-t-accent border-dashed" : "border-t-foreground"
                      }`}
                      title={`${formatTime(slot.time)} - ${getPostPreview(slot.post)}`}
                    >
                      <div className="slug text-meta-dim mb-1">
                        {formatTime(slot.time)} · {isQueued ? "Queued" : "Scheduled"}
                      </div>
                      <div className="font-display text-sm leading-tight text-ink truncate flex items-center gap-1.5">
                        <Icon size={12} className="shrink-0 text-meta" />
                        {getPostPreview(slot.post)}
                      </div>
                    </div>
                  );
                })}
                {daySlots.length === 0 && (
                  <div className="pt-1.5 border-t border-dashed border-rule text-center slug text-meta-dim">
                    Empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
