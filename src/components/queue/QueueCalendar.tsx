"use client";

import {
  IconChevronLeft,
  IconChevronRight,
  IconRepeat,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconNote,
  IconCalendarEvent,
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
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o - 1)}
          disabled={weekOffset <= 0}
          className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <IconChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium text-foreground/80">
          {headerLabel}
        </span>
        <button
          type="button"
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <IconChevronRight size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const daySlots = slotsByDay.get(day.toDateString()) || [];
          return (
            <div
              key={day.toDateString()}
              className={`rounded-xl border p-2 min-h-[140px] flex flex-col ${
                isToday
                  ? "border-vocl-accent/40 bg-vocl-accent/5"
                  : "border-white/5 bg-vocl-surface-dark"
              }`}
            >
              {/* Day header */}
              <div className="text-center mb-2">
                <div className="text-[10px] uppercase tracking-wider text-foreground/40">
                  {DAY_NAMES[day.getDay()]}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    isToday ? "text-vocl-accent" : "text-foreground/70"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>

              {/* Slots */}
              <div className="flex-1 space-y-1 overflow-y-auto max-h-[200px] scrollbar-thin">
                {daySlots.map((slot, idx) => {
                  const Icon = getPostTypeIcon(getPostContent(slot.post));
                  const isQueued = slot.type === "queued";
                  return (
                    <div
                      key={`${slot.type}-${"id" in slot.post ? slot.post.id : idx}-${idx}`}
                      className={`rounded-lg px-1.5 py-1 text-[10px] leading-tight flex items-start gap-1 ${
                        isQueued
                          ? "bg-vocl-accent/15 text-vocl-accent"
                          : "bg-green-500/15 text-green-400"
                      }`}
                      title={`${formatTime(slot.time)} - ${getPostPreview(slot.post)}`}
                    >
                      <Icon size={12} className="shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-[9px] opacity-70">
                          {formatTime(slot.time)}
                        </div>
                        <div className="truncate">
                          {getPostPreview(slot.post)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {daySlots.length === 0 && (
                  <div className="text-[10px] text-foreground/20 text-center pt-4">
                    No posts
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center text-xs text-foreground/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-vocl-accent/40" />
          <span>Queued</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-green-500/40" />
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <IconCalendarEvent size={12} className="text-vocl-accent/60" />
          <span>Today highlighted</span>
        </div>
      </div>
    </div>
  );
}
