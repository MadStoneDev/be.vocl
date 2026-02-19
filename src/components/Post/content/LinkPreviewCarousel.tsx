"use client";

import Image from "next/image";
import { IconLink, IconExternalLink, IconX } from "@tabler/icons-react";
import type { LinkPreviewData } from "@/types/database";

interface LinkPreviewCarouselProps {
  previews: LinkPreviewData[];
  editable?: boolean;
  onDismiss?: (url: string) => void;
  isLoading?: boolean;
}

function PreviewCard({
  preview,
  editable,
  onDismiss,
}: {
  preview: LinkPreviewData;
  editable?: boolean;
  onDismiss?: (url: string) => void;
}) {
  let hostname = "";
  try {
    hostname = new URL(preview.url).hostname.replace(/^www\./, "");
  } catch {
    hostname = preview.url;
  }

  const card = (
    <div className="relative rounded-xl overflow-hidden border border-neutral-300/50 bg-neutral-200/60">
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
        <div className="relative w-full aspect-video bg-neutral-300/50">
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
            <IconLink size={14} className="text-neutral-400 flex-shrink-0" />
          )}
          <span className="text-xs text-neutral-500 truncate">
            {preview.siteName || hostname}
          </span>
          {!editable && (
            <IconExternalLink
              size={12}
              className="text-neutral-400 ml-auto flex-shrink-0"
            />
          )}
        </div>

        {/* Title */}
        {preview.title && (
          <p className="text-sm font-medium text-neutral-800 line-clamp-2">
            {preview.title}
          </p>
        )}

        {/* Description */}
        {preview.description && (
          <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
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
    <div className="rounded-xl overflow-hidden border border-neutral-300/50 bg-neutral-200/60 animate-pulse">
      <div className="w-full aspect-video bg-neutral-300/80" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-neutral-300/80 rounded w-1/3" />
        <div className="h-4 bg-neutral-300/80 rounded w-3/4" />
        <div className="h-3 bg-neutral-300/80 rounded w-full" />
      </div>
    </div>
  );
}

export function LinkPreviewCarousel({
  previews,
  editable = false,
  onDismiss,
  isLoading = false,
}: LinkPreviewCarouselProps) {
  if (previews.length === 0 && !isLoading) return null;

  const isSingle = previews.length === 1 && !isLoading;

  return (
    <div className="px-3 sm:px-4 pb-3">
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
