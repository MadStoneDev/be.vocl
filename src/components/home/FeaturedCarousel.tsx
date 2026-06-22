"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

export interface FeaturedItem {
  slug: string;
  title: string;
  tags: string[];
  excerpt: string;
  image: string;
  author?: string;
}

const AUTOPLAY_MS = 7000;

export function FeaturedCarousel({ items }: { items: FeaturedItem[] }) {
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);

  const go = useCallback(
    (next: number, direction: number) => {
      setDir(direction);
      setIndex(((next % n) + n) % n);
    },
    [n]
  );
  const prev = useCallback(() => go(index - 1, -1), [go, index]);
  const next = useCallback(() => go(index + 1, 1), [go, index]);

  // Autoplay (looping), paused on hover/focus.
  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => go(index + 1, 1), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused, n, index, go]);

  if (n === 0) return null;

  const current = items[index];
  const prevItem = items[(index - 1 + n) % n];
  const nextItem = items[(index + 1) % n];

  return (
    <MotionConfig reducedMotion="user">
      <section
        aria-label="Featured stories"
        aria-roledescription="carousel"
        className="relative overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative mx-auto max-w-3xl px-4">
          {/* Peeking neighbours (wide screens only) */}
          {n > 1 && (
            <>
              <SidePeek item={prevItem} side="left" onClick={prev} />
              <SidePeek item={nextItem} side="right" onClick={next} />
            </>
          )}

          {/* Center stage */}
          <div className="relative aspect-[16/11] sm:aspect-[16/9] rounded-lg overflow-hidden shadow-2xl shadow-black/30 bg-gradient-to-br from-vocl-primary/40 to-vocl-accent/30">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.article
                key={current.slug}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {/* Slightly faded feature image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={current.image}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

                {/* Overlay content */}
                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
                  {current.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {current.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="type-display text-2xl font-bold leading-tight text-white sm:text-4xl">
                    {current.title}
                  </h2>
                  <p className="mt-3 max-w-2xl type-body text-sm text-white/85 sm:text-base line-clamp-3">
                    {current.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-3">
                    <Link
                      href="/signup"
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90"
                    >
                      Join to read &amp; reply
                    </Link>
                    {current.author && (
                      <span className="type-meta text-white/70">by {current.author}</span>
                    )}
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        {n > 1 && (
          <div className="mx-auto mt-4 flex max-w-3xl items-center justify-center gap-4 px-4">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous story"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-vocl-border text-foreground/70 transition-colors hover:bg-vocl-hover"
            >
              <IconChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose story">
              {items.map((it, i) => (
                <button
                  key={it.slug}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Story ${i + 1}`}
                  onClick={() => go(i, i > index ? 1 : -1)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? "w-6 bg-vocl-primary" : "w-2 bg-vocl-border hover:bg-foreground/30"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={next}
              aria-label="Next story"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-vocl-border text-foreground/70 transition-colors hover:bg-vocl-hover"
            >
              <IconChevronRight size={18} />
            </button>
          </div>
        )}
      </section>
    </MotionConfig>
  );
}

function SidePeek({
  item,
  side,
  onClick,
}: {
  item: FeaturedItem;
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous story" : "Next story"}
      tabIndex={-1}
      className={`group absolute top-1/2 hidden aspect-[3/4] w-[15%] max-w-[140px] -translate-y-1/2 overflow-hidden rounded-lg opacity-50 transition-all hover:opacity-80 lg:block bg-gradient-to-br from-vocl-primary/40 to-vocl-accent/30 ${
        side === "left" ? "left-0 -translate-x-[55%]" : "right-0 translate-x-[55%]"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/20" />
    </button>
  );
}
