"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { IconLink, IconExternalLink } from "@tabler/icons-react";

interface OpenGraphData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

// Simple cache to avoid refetching
const previewCache = new Map<string, OpenGraphData>();

export function LinkPreview({ url, className = "" }: LinkPreviewProps) {
  const [data, setData] = useState<OpenGraphData | null>(previewCache.get(url) || null);
  const [isLoading, setIsLoading] = useState(!previewCache.has(url));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url)!);
      setIsLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const response = await fetch(`/api/opengraph?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error("Failed to fetch");

        const ogData = await response.json();
        previewCache.set(url, ogData);
        setData(ogData);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  if (error || isLoading) {
    return null;
  }

  if (!data || (!data.title && !data.description && !data.image)) {
    return null;
  }

  const hostname = new URL(url).hostname.replace(/^www\./, "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block mt-2 rounded-xl overflow-hidden border border-white/10 bg-black/20 hover:bg-black/30 transition-colors ${className}`}
    >
      {/* Image */}
      {data.image && (
        <div className="relative w-full h-32 bg-white/5">
          <Image
            src={data.image}
            alt=""
            fill
            className="object-cover"
            unoptimized // External images
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        {/* Site info */}
        <div className="flex items-center gap-2 mb-1">
          {data.favicon ? (
            <Image
              src={data.favicon}
              alt=""
              width={14}
              height={14}
              className="rounded-sm"
              unoptimized
            />
          ) : (
            <IconLink size={14} className="text-foreground/40" />
          )}
          <span className="text-xs text-foreground/50 truncate">
            {data.siteName || hostname}
          </span>
          <IconExternalLink size={12} className="text-foreground/30 ml-auto flex-shrink-0" />
        </div>

        {/* Title */}
        {data.title && (
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {data.title}
          </p>
        )}

        {/* Description */}
        {data.description && (
          <p className="text-xs text-foreground/60 mt-1 line-clamp-2">
            {data.description}
          </p>
        )}
      </div>
    </a>
  );
}

/**
 * Extract URLs from text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}
