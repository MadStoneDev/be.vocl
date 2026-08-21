"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";

/**
 * Public search input. Navigates to /discover/search?q=... — used on the
 * discover hub and pre-filled on the results page. No auth required.
 */
export function PublicSearchBox({
  defaultValue = "",
  autoFocus = false,
  placeholder = "Search posts, people, and tags…",
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q.length < 1) return;
    router.push(`/discover/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={submit} role="search" className="relative w-full max-w-2xl">
      <IconSearch
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40"
        aria-hidden
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-label="Search be.vocl"
        className="w-full rounded-full border border-vocl-border bg-background py-3.5 pl-12 pr-28 type-body text-foreground shadow-sm outline-none transition-colors placeholder:text-foreground/40 focus:border-vocl-primary"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-vocl-primary px-5 py-2 type-meta font-semibold text-white transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
