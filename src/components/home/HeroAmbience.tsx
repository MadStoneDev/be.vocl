import type { CSSProperties } from "react";
import {
  IconMessageCircle,
  IconMusic,
  IconPhoto,
  IconChartBar,
  IconHeart,
  IconMicrophone,
} from "@tabler/icons-react";

/**
 * Ambient background for the landing hero. Post-type glyphs (speech bubble,
 * music note, photo, poll, heart, mic) drift along curved brand-pink threads
 * in the gutters beside the featured carousel — a soft hint of what you can
 * post on be.vocl, and a sense of things flowing toward the story.
 *
 * Server component: all motion is CSS (see globals.css `.hero-*`), so there's
 * no JS and it's fully honoured by `prefers-reduced-motion`. It's decorative
 * and non-interactive (`aria-hidden`, `pointer-events-none`), and only shows
 * on `xl` where real gutter space exists.
 */

// Shared connection lines within a 360×560 stage. They sweep from the outer,
// lower edge up toward the inner edge (nearest the carousel).
const PATHS = [
  "M 30 522 C 118 432, 92 320, 208 242 C 296 182, 300 108, 350 58",
  "M 8 430 C 108 380, 122 250, 240 190 C 320 150, 312 78, 346 28",
  "M 58 558 C 130 470, 108 358, 232 300 C 330 252, 320 148, 356 108",
];

type Glyph = {
  Icon: typeof IconMessageCircle;
  color: string;
  path: number;
  size: number;
  op: number;
  dur: string;
  delay: string;
  at: string; // static offset for reduced-motion
};

const GLYPHS: Glyph[] = [
  { Icon: IconMessageCircle, color: "var(--vocl-pink)", path: 0, size: 22, op: 0.3, dur: "16s", delay: "0s", at: "55%" },
  { Icon: IconMusic, color: "var(--vocl-accent)", path: 1, size: 20, op: 0.26, dur: "20s", delay: "-7s", at: "34%" },
  { Icon: IconPhoto, color: "var(--vocl-comment)", path: 2, size: 20, op: 0.26, dur: "18s", delay: "-3s", at: "68%" },
  { Icon: IconHeart, color: "var(--vocl-like)", path: 0, size: 16, op: 0.24, dur: "22s", delay: "-13s", at: "20%" },
  { Icon: IconChartBar, color: "var(--vocl-reblog)", path: 1, size: 18, op: 0.24, dur: "24s", delay: "-16s", at: "80%" },
  { Icon: IconMicrophone, color: "var(--vocl-pink)", path: 2, size: 18, op: 0.26, dur: "19s", delay: "-9s", at: "44%" },
];

function Stage({ side }: { side: "left" | "right" }) {
  const gradientId = `hero-line-${side}`;
  // Inner edge (nearest the carousel) is the right side of the box; fade the
  // outer edge toward the screen. The right stage is mirrored, so the same
  // internal mask fades toward its (mirrored) outer edge too.
  const mask =
    "linear-gradient(to right, transparent, #000 42%, #000 100%)";

  const wrapper =
    side === "left"
      ? "right-full mr-[-16px]"
      : "left-full ml-[-16px] scale-x-[-1]";

  return (
    <div
      className={`absolute top-1/2 h-[560px] w-[360px] -translate-y-1/2 ${wrapper}`}
      style={{ WebkitMaskImage: mask, maskImage: mask }}
    >
      {/* warm pink glow so the gutter never reads as flat empty space */}
      <div
        className="hero-glow absolute inset-0"
        style={
          {
            background:
              "radial-gradient(58% 48% at 62% 52%, color-mix(in srgb, var(--vocl-pink) 20%, transparent), transparent 72%)",
            "--glow-dur": side === "left" ? "10s" : "12s",
          } as CSSProperties
        }
      />

      {/* connection lines */}
      <svg
        width={360}
        height={560}
        viewBox="0 0 360 560"
        fill="none"
        className="hero-drift absolute inset-0"
        style={{ "--drift-dur": side === "left" ? "17s" : "21s" } as CSSProperties}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="560"
            x2="360"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="var(--vocl-pink)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--vocl-pink)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--vocl-accent)" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        {PATHS.map((d, i) => (
          <path
            key={i}
            className="hero-line"
            d={d}
            stroke={`url(#${gradientId})`}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="3 11"
            style={{ "--line-dur": `${12 + i * 3}s` } as CSSProperties}
          />
        ))}
      </svg>

      {/* glyphs riding the lines */}
      {GLYPHS.map((g, i) => {
        const Icon = g.Icon;
        return (
          <span
            key={i}
            className="hero-glyph"
            style={
              {
                "--glyph-path": `path("${PATHS[g.path]}")`,
                "--glyph-color": g.color,
                "--glyph-op": g.op,
                "--glyph-dur": g.dur,
                "--glyph-delay": g.delay,
                "--glyph-static": g.at,
              } as CSSProperties
            }
          >
            <Icon size={g.size} stroke={1.6} />
          </span>
        );
      })}
    </div>
  );
}

export function HeroAmbience() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 hidden overflow-hidden xl:block"
    >
      <div className="relative mx-auto h-full max-w-6xl">
        <Stage side="left" />
        <Stage side="right" />
      </div>
    </div>
  );
}
