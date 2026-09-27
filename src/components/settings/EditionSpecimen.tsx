"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Edition } from "@/editions/types";
import { loadEditionFonts } from "@/editions/fonts";

/**
 * A self-contained, faithful sample of a feed card or profile header rendered in
 * one edition. Built entirely from the edition's own token data (colours, fonts,
 * and the case/italic/weight/tracking flags) with inline styles, so it renders
 * correctly anywhere without depending on the generated [data-edition] CSS.
 *
 * Fonts load lazily when the specimen scrolls into view, so a full 33-tile
 * gallery doesn't request ~40 font families at once.
 */
export function EditionSpecimen({
  edition,
  variant,
  viewer,
  scale = 1,
}: {
  edition: Edition;
  variant: "feed" | "profile";
  viewer?: { name?: string | null; handle?: string | null };
  /** Multiplies every internal size. ~1 for a grid tile, ~1.6 for the large preview. */
  scale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView) loadEditionFonts(edition.id);
  }, [inView, edition.id]);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  const c = edition.colors;
  const f = edition.fonts;
  const t = edition.type;
  const px = (n: number) => `${n * scale}px`;

  const rootStyle: CSSProperties = {
    background: edition.effects.texture
      ? `${edition.effects.texture}, ${c.paper}`
      : c.paper,
    color: c.ink,
    padding: px(14),
    height: "100%",
    overflow: "hidden",
  };

  const nameplateStyle: CSSProperties = {
    fontFamily: f.nameplate,
    color: c.ink,
    textTransform: t.nameplateCase === "uppercase" ? "uppercase" : "none",
    fontStyle: t.nameplateItalic ? "italic" : "normal",
    fontWeight: t.nameplateWeight,
    letterSpacing: t.nameplateTracking,
    lineHeight: 1.05,
  };
  const headlineStyle: CSSProperties = {
    fontFamily: f.headline,
    color: c.ink,
    textTransform: t.headlineCase === "uppercase" ? "uppercase" : "none",
    fontStyle: t.headlineItalic ? "italic" : "normal",
    fontWeight: t.headlineWeight,
    lineHeight: 1.12,
  };
  const bodyStyle: CSSProperties = {
    fontFamily: f.body,
    color: c.body,
    fontStyle: t.bodyItalicAllowed ? "italic" : "normal",
    lineHeight: 1.4,
  };
  const uiStyle = (sizePx: number): CSSProperties => ({
    fontFamily: f.ui,
    color: c.meta,
    textTransform: t.uiCase === "uppercase" ? "uppercase" : "none",
    letterSpacing: t.uiTracking ?? "0.14em",
    fontSize: px(sizePx),
  });
  const hairline: CSSProperties = { borderTop: `1px solid ${c.rule}` };
  const sectionBreak: CSSProperties = {
    borderTop: edition.rules.sectionBreak,
    ...(edition.rules.sectionBreakImage
      ? { borderImage: edition.rules.sectionBreakImage }
      : {}),
  };
  const accentButton: CSSProperties = {
    background: c.accent,
    color: c.onAccent,
    fontFamily: f.ui,
    textTransform: t.uiCase === "uppercase" ? "uppercase" : "none",
    letterSpacing: t.uiTracking ?? "0.14em",
    fontSize: px(8.5),
    padding: `${px(4)} ${px(9)}`,
    display: "inline-block",
  };
  const name = viewer?.name?.trim() || "Your Name";
  const handle = viewer?.handle?.trim() || "you";

  if (variant === "profile") {
    return (
      <div ref={ref} style={rootStyle}>
        {/* banner */}
        <div
          style={{
            height: px(26),
            margin: `${px(-14)} ${px(-14)} ${px(10)}`,
            background: `repeating-linear-gradient(135deg, ${c.placeholderStripeA} 0 6px, ${c.placeholderStripeB} 6px 12px)`,
            borderBottom: `1px solid ${c.rule}`,
          }}
        />
        <div style={{ ...nameplateStyle, fontSize: px(22) }}>{name}</div>
        <div style={{ ...uiStyle(8.5), marginTop: px(4) }}>
          @{handle} · 128 posts · 2.4k readers
        </div>
        <div style={{ ...bodyStyle, fontSize: px(11.5), marginTop: px(8) }}>
          {edition.description}
        </div>
        {/* tabs */}
        <div style={{ ...sectionBreak, marginTop: px(10), paddingTop: px(8), display: "flex", gap: px(14) }}>
          {["Posts", "Media", "About"].map((tab, i) => (
            <span
              key={tab}
              style={{
                ...uiStyle(8.5),
                color: i === 0 ? c.ink : c.meta,
                paddingBottom: px(3),
                borderBottom: i === 0 ? `2px solid ${c.accent}` : "2px solid transparent",
              }}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // feed variant
  return (
    <div ref={ref} style={rootStyle}>
      {/* masthead */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: px(6) }}>
        <span style={{ fontFamily: f.headline, color: c.accentText, fontSize: px(13), letterSpacing: "-0.01em" }}>
          be.vocl
        </span>
        <span style={{ fontFamily: "ui-monospace, monospace", color: c.meta, fontSize: px(7.5), letterSpacing: "0.16em", textTransform: "uppercase", textAlign: "right", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          {edition.sampleMastheadLine}
        </span>
      </div>
      <div style={{ ...hairline, margin: `${px(8)} 0` }} />
      <div style={{ ...uiStyle(7.5), color: c.accentText }}>Column</div>
      <div style={{ ...headlineStyle, fontSize: px(17), marginTop: px(3) }}>
        Same paper, a new printing
      </div>
      <div style={{ ...bodyStyle, fontSize: px(11.5), marginTop: px(6) }}>
        Colours, type and rules change — the layout never does.
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: px(10) }}>
        <span style={uiStyle(8)}>By {name} · 2h</span>
        <span style={accentButton}>Follow</span>
      </div>
    </div>
  );
}
