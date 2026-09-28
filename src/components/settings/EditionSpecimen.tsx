"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Edition } from "@/editions/types";
import { loadEditionFonts } from "@/editions/fonts";

/**
 * A faithful sample of a be.vocl PAGE (left nav rail + main column) rendered in
 * one edition, built entirely from the edition's own token data (colours, fonts,
 * and the case/italic/weight/tracking flags) with inline styles.
 *
 * It renders at near-native size and is WIDER/taller than its container on
 * purpose: the caller clips it in a fixed window (overflow:hidden) so each tile
 * shows the top-left corner of the page — content running off the right edge
 * (~horizontal middle) and the bottom (whatever fits). No shrink-to-fit.
 *
 * Fonts load lazily when the specimen scrolls into view, so a full 33-tile
 * gallery doesn't request ~40 font families at once.
 */

// Native layout dimensions of the mock page. The tile window is narrower/shorter,
// so the right side (past ~PAGE_WIDTH/2) and the bottom get clipped.
const PAGE_WIDTH = 480;
const RAIL_WIDTH = 116;

export function EditionSpecimen({
  edition,
  variant,
  viewer,
}: {
  edition: Edition;
  variant: "feed" | "profile";
  viewer?: { name?: string | null; handle?: string | null };
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

  const pageStyle: CSSProperties = {
    width: PAGE_WIDTH,
    minWidth: PAGE_WIDTH,
    display: "flex",
    background: edition.effects.texture
      ? `${edition.effects.texture}, ${c.paper}`
      : c.paper,
    color: c.ink,
  };

  const uiStyle = (sizePx: number, color = c.meta): CSSProperties => ({
    fontFamily: f.ui,
    color,
    textTransform: t.uiCase === "uppercase" ? "uppercase" : "none",
    letterSpacing: t.uiTracking ?? "0.14em",
    fontSize: sizePx,
    lineHeight: 1.5,
  });
  const nameplateStyle = (sizePx: number): CSSProperties => ({
    fontFamily: f.nameplate,
    color: c.ink,
    textTransform: t.nameplateCase === "uppercase" ? "uppercase" : "none",
    fontStyle: t.nameplateItalic ? "italic" : "normal",
    fontWeight: t.nameplateWeight,
    letterSpacing: t.nameplateTracking,
    lineHeight: 1.05,
    fontSize: sizePx,
  });
  const headlineStyle = (sizePx: number): CSSProperties => ({
    fontFamily: f.headline,
    color: c.ink,
    textTransform: t.headlineCase === "uppercase" ? "uppercase" : "none",
    fontStyle: t.headlineItalic ? "italic" : "normal",
    fontWeight: t.headlineWeight,
    lineHeight: 1.12,
    fontSize: sizePx,
  });
  const bodyStyle = (sizePx: number): CSSProperties => ({
    fontFamily: f.body,
    color: c.body,
    fontStyle: t.bodyItalicAllowed ? "italic" : "normal",
    lineHeight: 1.45,
    fontSize: sizePx,
  });
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
    fontSize: 9,
    padding: "5px 11px",
    display: "inline-block",
  };

  const name = viewer?.name?.trim() || "Your Name";
  const handle = viewer?.handle?.trim() || "you";

  const nav = ["Home", "Feed", "Messages", "Queue", "Profile"];

  return (
    <div ref={ref} style={pageStyle}>
      {/* Left nav rail — persistent app chrome */}
      <div
        style={{
          width: RAIL_WIDTH,
          minWidth: RAIL_WIDTH,
          borderRight: `1px solid ${c.rule}`,
          padding: "12px 10px",
        }}
      >
        <div style={{ fontFamily: f.headline, color: c.accentText, fontSize: 15, letterSpacing: "-0.01em", marginBottom: 12 }}>
          be.vocl
        </div>
        {nav.map((item, i) => (
          <div key={item} style={{ ...uiStyle(9.5, i === 1 ? c.ink : c.meta), marginBottom: 8 }}>
            {item}
          </div>
        ))}
      </div>

      {/* Main column */}
      <div style={{ flex: 1, padding: 14, minWidth: 0 }}>
        {variant === "profile" ? (
          <>
            <div
              style={{
                height: 34,
                margin: "-14px -14px 10px",
                background: `repeating-linear-gradient(135deg, ${c.placeholderStripeA} 0 7px, ${c.placeholderStripeB} 7px 14px)`,
                borderBottom: `1px solid ${c.rule}`,
              }}
            />
            <div style={nameplateStyle(27)}>{name}</div>
            <div style={{ ...uiStyle(9), marginTop: 5 }}>@{handle} · 128 posts · 2.4k readers</div>
            <div style={{ ...bodyStyle(13), marginTop: 9 }}>{edition.description}</div>
            <div style={{ ...sectionBreak, marginTop: 12, paddingTop: 9, display: "flex", gap: 16 }}>
              {["Posts", "Media", "About"].map((tab, i) => (
                <span
                  key={tab}
                  style={{
                    ...uiStyle(9, i === 0 ? c.ink : c.meta),
                    paddingBottom: 3,
                    borderBottom: i === 0 ? `2px solid ${c.accent}` : "2px solid transparent",
                  }}
                >
                  {tab}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={uiStyle(8.5, c.accentText)}>The Feed</span>
              <span style={{ fontFamily: "ui-monospace, monospace", color: c.meta, fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {edition.sampleMastheadLine}
              </span>
            </div>
            <div style={{ borderTop: `1px solid ${c.rule}`, margin: "9px 0" }} />
            <div style={uiStyle(8, c.accentText)}>Column</div>
            <div style={{ ...headlineStyle(19), marginTop: 4 }}>Same paper, a new printing</div>
            <div style={{ ...bodyStyle(13), marginTop: 7 }}>
              Colours, type and rules change — the layout never does. Every edition
              is a different printing of the same page.
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 11 }}>
              <span style={uiStyle(8.5)}>By {name} · 2h</span>
              <span style={accentButton}>Follow</span>
            </div>
            <div style={{ ...sectionBreak, marginTop: 13, paddingTop: 11 }}>
              <div style={uiStyle(8, c.accentText)}>Column</div>
              <div style={{ ...headlineStyle(17), marginTop: 4 }}>A second dispatch, below the fold</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
