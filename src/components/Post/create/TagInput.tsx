"use client";

import { useState, useCallback } from "react";
import { IconX, IconHash } from "@tabler/icons-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
  placeholder?: string;
}

export function TagInput({
  tags,
  onChange,
  maxTags = 10,
  placeholder = "Add tags...",
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = useCallback(
    (tag: string) => {
      const normalizedTag = tag
        .trim()
        .replace(/^#/, "")
        .replace(/\s+/g, " "); // Normalize multiple spaces to single space

      if (
        normalizedTag &&
        normalizedTag.length >= 2 &&
        !tags.includes(normalizedTag) &&
        tags.length < maxTags
      ) {
        onChange([...tags, normalizedTag]);
      }
      setInputValue("");
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-vocl-accent/20 text-vocl-accent text-sm"
          >
            <IconHash size={14} />
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:text-white transition-colors"
            >
              <IconX size={14} />
            </button>
          </span>
        ))}
      </div>

      {tags.length < maxTags && (
        <div className="relative">
          <IconHash
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => inputValue && addTag(inputValue)}
            placeholder={placeholder}
            className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent transition-colors text-sm"
            maxLength={30}
          />
        </div>
      )}

      <p className="text-foreground/30 text-xs">
        {tags.length}/{maxTags} tags • Press Enter or comma to add
      </p>
    </div>
  );
}
