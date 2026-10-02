"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * A fill <Image> that shows a calm, panning gradient placeholder while loading,
 * then fades the image in over ~200ms and drops the gradient (so it doesn't show
 * through transparent PNGs).
 *
 * Drop-in for a bare `<Image fill … />` inside an existing positioned, aspect-
 * ratio box (the box holds the space, so nothing jumps when the image arrives).
 * The placeholder colour is deterministic from `colorKey` (post/image id), so a
 * given image always loads with the same colour.
 *
 * Motion is CSS-driven and disabled under prefers-reduced-motion (see
 * .img-placeholder in globals.css).
 */

function hueFromKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 360;
}

type Props = Omit<ImageProps, "onLoad" | "placeholder"> & {
  /** Stable id (post/image id) for a deterministic placeholder colour. */
  colorKey?: string;
};

export function ImageWithPlaceholder({ colorKey, className, alt, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false);
  const hue = hueFromKey(colorKey ?? String(rest.src ?? ""));
  const gradient = `linear-gradient(135deg, hsl(${hue} 52% 52%), hsl(${(hue + 42) % 360} 52% 38%))`;

  return (
    <>
      {!loaded && (
        <span
          aria-hidden="true"
          className="img-placeholder absolute inset-0"
          style={{ backgroundImage: gradient, backgroundSize: "200% 200%" }}
        />
      )}
      <Image
        {...rest}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${className ?? ""} transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}
