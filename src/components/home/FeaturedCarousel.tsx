"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
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

/** A branded hero shown as the first carousel slide (no image → instant LCP). */
export interface HeroSlide {
  kicker?: string;
  title: string;
  subhead: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

type Slide =
  | { kind: "hero"; key: string; hero: HeroSlide }
  | { kind: "story"; key: string; story: FeaturedItem };

const AUTOPLAY_MS = 7000;

export function FeaturedCarousel({
  items,
  hero,
}: {
  items: FeaturedItem[];
  hero?: HeroSlide;
}) {
  // The hero is just slide 0 of the same carousel — controls, dots and
  // side-peeks all treat it as one more slide.
  const slides: Slide[] = [
    ...(hero ? [{ kind: "hero" as const, key: "__hero__", hero }] : []),
    ...items.map((story) => ({ kind: "story" as const, key: story.slug, story })),
  ];
  const n = slides.length;

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

  const current = slides[index];
  const prevSlide = slides[(index - 1 + n) % n];
  const nextSlide = slides[(index + 1) % n];

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
        <div className="relative mx-auto max-w-6xl px-4">
          {/* Peeking neighbours (wide screens only) */}
          {n > 1 && (
            <>
              <SidePeek slide={prevSlide} side="left" onClick={prev} />
              <SidePeek slide={nextSlide} side="right" onClick={next} />
            </>
          )}

          {/* Center stage */}
          {/* max-w-full caps the inline size to the container. Without it, aspect-ratio
              + min-h-[340px] makes the browser derive width from the height
              (340 × 16/10 = 544px), overflowing the viewport on mobile. */}
          <div className="relative max-w-full aspect-[16/10] sm:aspect-[2/1] lg:aspect-[21/9] min-h-[340px] rounded-lg overflow-hidden shadow-2xl shadow-black/30 bg-gradient-to-br from-vocl-primary/40 to-vocl-primary/30">
            <AnimatePresence initial={false} custom={dir} mode="popLayout">
              <motion.article
                key={current.key}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                {current.kind === "hero" ? (
                  <HeroStage hero={current.hero} />
                ) : (
                  <StoryStage story={current.story} />
                )}
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
              aria-label="Previous slide"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-vocl-border text-foreground/70 transition-colors hover:bg-vocl-hover"
            >
              <IconChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-2" role="tablist" aria-label="Choose slide">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={s.kind === "hero" ? "Welcome" : `Story ${i + 1}`}
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
              aria-label="Next slide"
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

/** The branded hero slide — the page's main promise + primary CTA. */
function HeroStage({ hero }: { hero: HeroSlide }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-vocl-primary via-vocl-primary to-[#7a0730]" />
      {/* Soft texture so the flat gradient doesn't feel bare */}
      <div className="absolute inset-0 opacity-40 [background:radial-gradient(120%_120%_at_10%_0%,rgba(255,255,255,0.25),transparent_55%)]" />
      <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 lg:p-14">
        {hero.kicker && (
          <span className="type-meta uppercase tracking-widest text-white/70 font-semibold">
            {hero.kicker}
          </span>
        )}
        <h1 className="mt-3 max-w-3xl type-display text-3xl font-bold leading-[1.1] text-white sm:text-5xl">
          {hero.title}
        </h1>
        <p className="mt-4 max-w-2xl type-body text-sm text-white/90 sm:text-lg">
          {hero.subhead}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href={hero.primaryHref}
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 sm:text-base"
          >
            {hero.primaryLabel}
          </Link>
          {hero.secondaryHref && hero.secondaryLabel && (
            <Link
              href={hero.secondaryHref}
              className="rounded-xl border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:text-base"
            >
              {hero.secondaryLabel}
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

/** A featured story slide. */
function StoryStage({ story }: { story: FeaturedItem }) {
  return (
    <>
      {/* Slightly faded feature image */}
      <Image
        src={story.image}
        alt=""
        fill
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20" />

      {/* Overlay content */}
      <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8">
        {story.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {story.tags.slice(0, 3).map((t) => (
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
          {story.title}
        </h2>
        <p className="mt-3 max-w-2xl type-body text-sm text-white/85 sm:text-base line-clamp-3">
          {story.excerpt}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={`/featured/${story.slug}`}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            Read this story
          </Link>
          {story.author && (
            <span className="type-meta text-white/70">by {story.author}</span>
          )}
        </div>
      </div>
    </>
  );
}

function SidePeek({
  slide,
  side,
  onClick,
}: {
  slide: Slide;
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous slide" : "Next slide"}
      tabIndex={-1}
      className={`group absolute top-1/2 hidden aspect-[3/4] w-[15%] max-w-[140px] -translate-y-1/2 overflow-hidden rounded-lg opacity-50 transition-all hover:opacity-80 lg:block bg-gradient-to-br from-vocl-primary/40 to-vocl-primary/30 ${
        side === "left" ? "left-0 -translate-x-[55%]" : "right-0 translate-x-[55%]"
      }`}
    >
      {slide.kind === "hero" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-vocl-primary via-vocl-primary to-[#7a0730]">
          <span className="type-display text-sm font-bold text-white">be.vocl</span>
        </div>
      ) : (
        <Image src={slide.story.image} alt="" fill sizes="140px" className="object-cover" />
      )}
      <div className="absolute inset-0 bg-black/40 transition-colors group-hover:bg-black/20" />
    </button>
  );
}
