"use client";

import { useState } from "react";
import { IconCalendar, IconClock } from "@tabler/icons-react";

interface SchedulePickerProps {
  value?: Date;
  onChange: (date: Date | null) => void;
  minDate?: Date;
}

export function SchedulePicker({
  value,
  onChange,
  minDate = new Date(),
}: SchedulePickerProps) {
  const [date, setDate] = useState<string>(
    value ? value.toISOString().split("T")[0] : ""
  );
  const [time, setTime] = useState<string>(
    value
      ? value.toTimeString().slice(0, 5)
      : new Date(Date.now() + 3600000).toTimeString().slice(0, 5) // Default to 1 hour from now
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

  // Generate quick time options
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
      newDate = new Date(Date.now() + option.hours! * 3600000);
    }
    setDate(newDate.toISOString().split("T")[0]);
    setTime(newDate.toTimeString().slice(0, 5));
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-background/50 border border-white/10 text-foreground focus:outline-none focus:border-vocl-accent transition-colors text-sm"
          />
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
