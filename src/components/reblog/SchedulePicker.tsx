"use client";

import { useState } from "react";
import { IconCalendar, IconClock } from "@tabler/icons-react";

interface SchedulePickerProps {
  value?: Date;
  onChange: (date: Date | null) => void;
  minDate?: Date;
}

// Round minutes to nearest 5-minute increment
function roundToFiveMinutes(date: Date): Date {
  const rounded = new Date(date);
  const minutes = rounded.getMinutes();
  const roundedMinutes = Math.ceil(minutes / 5) * 5;
  rounded.setMinutes(roundedMinutes, 0, 0);
  return rounded;
}

// Generate time options in 5-minute increments
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 5) {
      options.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

export function SchedulePicker({
  value,
  onChange,
  minDate = new Date(),
}: SchedulePickerProps) {
  const defaultTime = roundToFiveMinutes(new Date(Date.now() + 3600000));

  const [date, setDate] = useState<string>(
    value ? value.toISOString().split("T")[0] : ""
  );
  const [time, setTime] = useState<string>(
    value
      ? `${value.getHours().toString().padStart(2, "0")}:${(Math.floor(value.getMinutes() / 5) * 5).toString().padStart(2, "0")}`
      : `${defaultTime.getHours().toString().padStart(2, "0")}:${defaultTime.getMinutes().toString().padStart(2, "0")}`
  );

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (newDate && time) {
      const combined = new Date(`${newDate}T${time}`);
      if (combined > minDate) {
        onChange(combined);
      }
    } else {
      onChange(null);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (date && newTime) {
      const combined = new Date(`${date}T${newTime}`);
      if (combined > minDate) {
        onChange(combined);
      }
    } else {
      onChange(null);
    }
  };

  // Generate quick time options (rounded to 5 minutes)
  const quickOptions = [
    { label: "In 1 hour", hours: 1 },
    { label: "In 3 hours", hours: 3 },
    { label: "Tomorrow 9 AM", custom: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    }},
    { label: "Tomorrow 6 PM", custom: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      return tomorrow;
    }},
  ];

  const handleQuickOption = (option: typeof quickOptions[0]) => {
    let newDate: Date;
    if (option.custom) {
      newDate = option.custom();
    } else {
      newDate = roundToFiveMinutes(new Date(Date.now() + option.hours! * 3600000));
    }
    setDate(newDate.toISOString().split("T")[0]);
    setTime(`${newDate.getHours().toString().padStart(2, "0")}:${newDate.getMinutes().toString().padStart(2, "0")}`);
    onChange(newDate);
  };

  const minDateStr = minDate.toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Quick options */}
      <div className="flex flex-wrap gap-2">
        {quickOptions.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleQuickOption(option)}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-foreground/70 text-sm hover:bg-white/10 hover:text-foreground transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Custom date/time */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <IconCalendar
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            min={minDateStr}
            className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent transition-colors text-sm"
          />
        </div>
        <div className="relative">
          <IconClock
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none z-10"
          />
          <select
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent transition-colors text-sm appearance-none cursor-pointer"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {new Date(`2000-01-01T${t}`).toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview */}
      {date && time && (
        <p className="text-sm text-foreground/50">
          Will be posted on{" "}
          <span className="text-vocl-accent font-medium">
            {new Date(`${date}T${time}`).toLocaleString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
        </p>
      )}
    </div>
  );
}
