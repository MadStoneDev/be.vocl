"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconX, IconZoomIn, IconZoomOut, IconLoader2 } from "@tabler/icons-react";

interface ImageCropModalProps {
  /** Object URL or data URL of the source image. */
  src: string;
  /** Output aspect ratio (width / height). 1 for a square avatar. */
  aspect: number;
  /** Draw a circular mask over the frame (avatars). */
  round?: boolean;
  title?: string;
  /** Output width in px; height is derived from aspect. */
  outputWidth?: number;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const MAX_ZOOM = 4;

export function ImageCropModal({
  src,
  aspect,
  round = false,
  title = "Adjust image",
  outputWidth = 1024,
  busy = false,
  onCancel,
  onConfirm,
}: ImageCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Measure the crop frame (responsive) so the crop maths use real pixels.
  useEffect(() => {
    const measure = () => {
      const el = frameRef.current;
      if (el) setFrame({ w: el.clientWidth, h: el.clientHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const baseScale =
    natural.w && natural.h && frame.w && frame.h
      ? Math.max(frame.w / natural.w, frame.h / natural.h)
      : 1;
  const dw = natural.w * baseScale * zoom;
  const dh = natural.h * baseScale * zoom;
  const maxX = Math.max(0, (dw - frame.w) / 2);
  const maxY = Math.max(0, (dh - frame.h) / 2);

  const clamp = useCallback(
    (o: { x: number; y: number }) => ({
      x: Math.min(maxX, Math.max(-maxX, o.x)),
      y: Math.min(maxY, Math.max(-maxY, o.y)),
    }),
    [maxX, maxY],
  );

  // Re-clamp whenever zoom / frame / image changes.
  useEffect(() => {
    setOffset((o) => clamp(o));
  }, [zoom, frame, natural, clamp]);

  const onImgLoad = () => {
    const el = imgRef.current;
    if (el) setNatural({ w: el.naturalWidth, h: el.naturalHeight });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(1, z - e.deltaY * 0.0015)));
  };

  const imgLeft = (frame.w - dw) / 2 + offset.x;
  const imgTop = (frame.h - dh) / 2 + offset.y;

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img || !baseScale) return;
    const scale = baseScale * zoom;
    const sx = Math.max(0, -imgLeft / scale);
    const sy = Math.max(0, -imgTop / scale);
    const sw = frame.w / scale;
    const sh = frame.h / scale;

    const outW = outputWidth;
    const outH = Math.round(outputWidth / aspect);
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-lg rounded-lg bg-background border border-vocl-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-vocl-border">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-vocl-hover transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Crop stage */}
        <div className="p-5">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
            className={`relative mx-auto w-full overflow-hidden bg-vocl-hover touch-none cursor-grab active:cursor-grabbing ${
              round ? "rounded-full" : "rounded-sm"
            }`}
            style={{ maxWidth: round ? 300 : 460, aspectRatio: String(aspect) }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              className="absolute select-none max-w-none"
              style={{ width: dw, height: dh, left: imgLeft, top: imgTop }}
            />
            {/* Framing hint */}
            <div
              className={`pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/25 ${
                round ? "rounded-full" : "rounded-sm"
              }`}
            />
          </div>

          {/* Zoom control */}
          <div className="mt-5 flex items-center gap-3">
            <IconZoomOut size={18} className="text-foreground/50 shrink-0" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-vocl-primary"
              aria-label="Zoom"
            />
            <IconZoomIn size={18} className="text-foreground/50 shrink-0" />
          </div>
          <p className="mt-2 text-xs text-foreground/45 text-center">
            Drag to reposition · scroll or use the slider to zoom
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-vocl-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2.5 rounded-sm bg-vocl-hover text-foreground font-medium hover:bg-vocl-hover-strong transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy || !natural.w}
            className="px-5 py-2.5 rounded-sm bg-vocl-primary text-white font-semibold hover:bg-vocl-primary-hover transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {busy && <IconLoader2 size={18} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
