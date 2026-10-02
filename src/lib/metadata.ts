import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Truncate `text` to at most `max` characters WITHOUT cutting a word in half:
 * slice at `max`, drop any trailing partial word, and append an ellipsis. Used
 * for titles (~60) and meta descriptions (~155) so we never emit "…was about
 * polis…". Returns the input unchanged when it's already within budget.
 */
export function truncateWords(text: string, max: number): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  // Drop the trailing partial word unless there's only one long word.
  const trimmed = slice.replace(/\s+\S*$/, "");
  return `${(trimmed || slice).trimEnd()}…`;
}

/** Absolute canonical URL for a path (e.g. "/c/foo" → "https://…/c/foo"). */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Metadata for a private / app-only page: a title (wrapped by the root
 * "%s | be.vocl" template), an optional description, and robots noindex so the
 * surface never shows up in search results.
 */
export function appPageMetadata(title: string, description?: string): Metadata {
  return {
    title,
    ...(description ? { description } : {}),
    robots: { index: false, follow: false },
  };
}
