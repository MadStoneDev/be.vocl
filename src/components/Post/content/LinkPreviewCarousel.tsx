"use client";

import Image from "next/image";
import { IconLink, IconExternalLink, IconX } from "@tabler/icons-react";
import type { LinkPreviewData } from "@/types/database";

interface LinkPreviewCarouselProps {
  previews: LinkPreviewData[];
  editable?: boolean;
  onDismiss?: (url: string) => void;
  isLoading?: boolean;
  /** Broadsheet article mode: theme-aware card (no fixed light gray). */
  article?: boolean;
}

function PreviewCard({
  preview,
  editable,
  onDismiss,
  article,
}: {
  preview: LinkPreviewData;
  editable?: boolean;
  onDismiss?: (url: string) => void;
  article?: boolean;
}) {
  let hostname = "";
  try {
    hostname = new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    hostname = preview.url;
  }

  const c = article
    ? { card: "border-vocl-border bg-vocl-hover", img: "bg-vocl-hover", site: "text-foreground/55", title: "text-foreground", desc: "text-foreground/55", icon: "text-foreground/40" }
    : { card: "border-vocl-border bg-vocl-hover", img: "bg-vocl-hover", site: "text-foreground/55", title: "text-foreground", desc: "text-foreground/55", icon: "text-foreground/45" };

  const card = (
    <div className={`relative rounded-sm overflow-hidden border ${c.card}`}>
      {/* Dismiss button */}
      {editable && onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDismiss(preview.url);
          }}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Remove preview"
        >
          <IconX size={14} />
        </button>
      )}

      {/* OG Image */}
      {preview.image && (
        <div className={`relative w-full aspect-video ${c.img}`}>
          <Image
            src={preview.image}
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 mb-1">
          {preview.favicon ? (
            <Image
              src={preview.favicon}
              alt=""
              width={14}
              height={14}
              className="rounded-sm flex-shrink-0"
              unoptimized
            />
          ) : (
            <IconLink size={14} className={`${c.icon} flex-shrink-0`} />
          )}
          <span className={`text-xs ${c.site} truncate`}>
            {preview.siteName || hostname}
          </span>
          {!editable && (
            <IconExternalLink
              size={12}
              className={`${c.icon} ml-auto flex-shrink-0`}
            />
          )}
        </div>

        {/* Title */}
        {preview.title && (
          <p className={`text-sm font-medium ${c.title} line-clamp-2`}>
            {preview.title}
          </p>
        )}

        {/* Description */}
        {preview.description && (
          <p className={`text-xs ${c.desc} mt-1 line-clamp-2`}>
            {preview.description}
          </p>
        )}
      </div>
    </div>
  );

  if (editable) return card;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block hover:opacity-90 transition-opacity"
    >
      {card}
    </a>
  );
}

function LoadingSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-vocl-border bg-vocl-hover animate-pulse">
      <div className="w-full aspect-video bg-vocl-hover" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-vocl-hover rounded w-1/3" />
        <div className="h-4 bg-vocl-hover rounded w-3/4" />
        <div className="h-3 bg-vocl-hover rounded w-full" />
      </div>
    </div>
  );
}

export function LinkPreviewCarousel({
  previews,
  editable = false,
  onDismiss,
  isLoading = false,
  article = false,
}: LinkPreviewCarouselProps) {
  if (previews.length === 0 && !isLoading) return null;

  const isSingle = previews.length === 1 && !isLoading;

  return (
    <div className={article ? "" : "px-3 sm:px-4 pb-3"}>
      <div
        className={`flex gap-3 ${
          isSingle
            ? ""
            : "overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        }`}
        style={isSingle ? undefined : { scrollbarWidth: "none" }}
      >
        {previews.map((preview) => (
          <div
            key={preview.url}
            className={`snap-start ${
              isSingle ? "w-full" : "w-[80%] flex-shrink-0"
            }`}
          >
            <PreviewCard
              preview={preview}
              editable={editable}
              onDismiss={onDismiss}
              article={article}
            />
          </div>
        ))}
        {isLoading && (
          <div
            className={`snap-start ${
              previews.length === 0 ? "w-full" : "w-[80%] flex-shrink-0"
            }`}
          >
            <LoadingSkeleton />
          </div>
        )}
      </div>
    </div>
  );
}
