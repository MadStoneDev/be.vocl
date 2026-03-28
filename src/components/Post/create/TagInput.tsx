"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { IconX, IconHash, IconLoader2, IconUser } from "@tabler/icons-react";
import { suggestTags } from "@/actions/tags";

interface TagSuggestion {
  id: string;
  name: string;
  postCount: number;
  isOwn: boolean;
}

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
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (tag: string) => {
      const normalizedTag = tag
        .trim()
        .replace(/^#/, "")
        .replace(/\s+/g, " ");

      if (
        normalizedTag &&
        normalizedTag.length >= 2 &&
        !tags.includes(normalizedTag) &&
        tags.length < maxTags
      ) {
        onChange([...tags, normalizedTag]);
      }
      setInputValue("");
      setSuggestions([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
    },
    [tags, onChange, maxTags]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(tags.filter((tag) => tag !== tagToRemove));
    },
    [tags, onChange]
  );

  // Fetch suggestions with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const query = inputValue.trim().replace(/^#/, "");
    if (query.length < 1) {
      setSuggestions([]);
      setShowDropdown(false);
      setHighlightedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await suggestTags(query, { limit: 10 });
        if (result.success && result.tags) {
          const filtered = result.tags.filter(
            (t) => !tags.includes(t.name)
          );
          setSuggestions(filtered);
          setShowDropdown(true);
          setHighlightedIndex(-1);
        }
      } catch {
        // Silently fail — user can still type tags manually
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, tags]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const qNorm = inputValue.trim().replace(/^#/, "");
    const hasCreateOption = qNorm.length >= 2 && !suggestions.some(
      (s) => s.name.toLowerCase() === qNorm.toLowerCase()
    );
    const totalItems = suggestions.length + (hasCreateOption ? 1 : 0);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (showDropdown && totalItems > 0) {
        setHighlightedIndex((prev) =>
          prev < totalItems - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (showDropdown && totalItems > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : totalItems - 1
        );
      }
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      e.stopPropagation();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        addTag(suggestions[highlightedIndex].name);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const queryNormalized = inputValue.trim().replace(/^#/, "");
  const exactMatchExists = suggestions.some(
    (s) => s.name.toLowerCase() === queryNormalized.toLowerCase()
  );

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
          {isLoading && (
            <IconLoader2
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 animate-spin"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            enterKeyHint="done"
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value;
              if (value.includes(",")) {
                const parts = value.split(",");
                for (const part of parts.slice(0, -1)) {
                  if (part.trim()) {
                    addTag(part);
                  }
                }
                setInputValue(parts[parts.length - 1]);
              } else {
                setInputValue(value);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true);
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => {
                if (inputValue) addTag(inputValue);
              }, 200);
            }}
            placeholder={placeholder}
            className="w-full py-2.5 pl-10 pr-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent transition-colors text-sm"
            maxLength={30}
            autoComplete="off"
          />

          {/* Suggestions dropdown */}
          {showDropdown && (suggestions.length > 0 || (queryNormalized.length >= 2 && !exactMatchExists)) && (
            <div
              ref={dropdownRef}
              className="absolute z-50 left-0 right-0 mt-1 rounded-xl bg-vocl-surface-dark border border-white/10 shadow-xl overflow-hidden max-h-52 overflow-y-auto"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blur
                    addTag(suggestion.name);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors ${
                    index === highlightedIndex
                      ? "bg-vocl-accent/20 text-foreground"
                      : "text-foreground/80 hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <IconHash size={14} className="text-vocl-accent shrink-0" />
                    {suggestion.name}
                    {suggestion.isOwn && (
                      <IconUser size={12} className="text-vocl-accent/60" title="Used by you" />
                    )}
                  </span>
                  <span className="text-xs text-foreground/40">
                    {suggestion.postCount} {suggestion.postCount === 1 ? "post" : "posts"}
                  </span>
                </button>
              ))}

              {/* Create new tag option */}
              {queryNormalized.length >= 2 && !exactMatchExists && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addTag(queryNormalized);
                  }}
                  onMouseEnter={() => setHighlightedIndex(suggestions.length)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-left border-t border-white/5 transition-colors ${
                    highlightedIndex === suggestions.length
                      ? "bg-vocl-accent/20 text-foreground"
                      : "text-foreground/60 hover:bg-white/5"
                  }`}
                >
                  <span className="text-sm">
                    Create <span className="text-vocl-accent font-medium">#{queryNormalized}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-foreground/30 text-xs">
        {tags.length}/{maxTags} tags • Press Enter or comma to add
      </p>
    </div>
  );
}
