import { ImageResponse } from "next/og";

// Default social share card for pages that don't set their own image.
export const alt = "be.vocl — a calmer corner of the social web";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "linear-gradient(135deg, #F20D5E 0%, #C10B4C 55%, #7A0730 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 6,
            textTransform: "uppercase",
            opacity: 0.75,
            fontWeight: 600,
          }}
        >
          be.vocl
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 84,
            fontWeight: 800,
            lineHeight: 1.05,
            maxWidth: 980,
          }}
        >
          Say the thing you can&apos;t say anywhere else.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 34,
            opacity: 0.9,
            maxWidth: 900,
          }}
        >
          Write, vent and share — under your name or a pen name. You choose who
          sees it.
        </div>
      </div>
    ),
    { ...size }
  );
}
