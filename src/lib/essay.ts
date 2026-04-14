/**
 * Essay helpers — word count, reading time, and essay-threshold detection.
 */

const WORDS_PER_MINUTE = 225;
const ESSAY_WORD_THRESHOLD = 300;

export function countWords(plain: string): number {
  if (!plain) return 0;
  return plain
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readingTimeMinutes(plain: string): number {
  const words = countWords(plain);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function isEssayLength(plain: string): boolean {
  return countWords(plain) >= ESSAY_WORD_THRESHOLD;
}
