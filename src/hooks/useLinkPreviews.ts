"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { extractUrls } from "@/components/chat/LinkPreview";
import type { LinkPreviewData } from "@/types/database";

// Module-level cache shared across all instances
const ogCache = new Map<string, LinkPreviewData>();

const MAX_PREVIEWS = 5;
const DEBOUNCE_MS = 800;

interface UseLinkPreviewsOptions {
  text: string;
  initialPreviews?: LinkPreviewData[];
}

interface UseLinkPreviewsReturn {
  previews: LinkPreviewData[];
  isLoading: boolean;
  dismiss: (url: string) => void;
  getPreviewsForSave: () => LinkPreviewData[];
}

export function useLinkPreviews({
  text,
  initialPreviews,
}: UseLinkPreviewsOptions): UseLinkPreviewsReturn {
  const [previews, setPreviews] = useState<LinkPreviewData[]>(
    initialPreviews || []
  );
  const [isLoading, setIsLoading] = useState(false);
  const dismissedUrls = useRef(new Set<string>());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrlsRef = useRef<string[]>([]);

  // Seed cache from initial previews
  useEffect(() => {
    if (initialPreviews) {
      for (const p of initialPreviews) {
        ogCache.set(p.url, p);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPreview = useCallback(
    async (url: string, signal: AbortSignal): Promise<LinkPreviewData | null> => {
      if (ogCache.has(url)) return ogCache.get(url)!;
      try {
        const res = await fetch(
          `/api/opengraph?url=${encodeURIComponent(url)}`,
          { signal }
        );
        if (!res.ok) return null;
        const data: LinkPreviewData = await res.json();
        data.url = url; // ensure URL is always set
        ogCache.set(url, data);
        return data;
      } catch {
        return null;
      }
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const urls = extractUrls(text).slice(0, MAX_PREVIEWS);

      // Clean dismissed set: if a URL was removed from text, un-dismiss it
      for (const dismissed of dismissedUrls.current) {
        if (!urls.includes(dismissed)) {
          dismissedUrls.current.delete(dismissed);
        }
      }

      // Filter out dismissed
      const activeUrls = urls.filter((u) => !dismissedUrls.current.has(u));

      // Skip if URLs haven't changed
      const prevSorted = [...prevUrlsRef.current].sort().join("|");
      const currSorted = [...activeUrls].sort().join("|");
      if (prevSorted === currSorted) return;
      prevUrlsRef.current = activeUrls;

      // Cancel previous fetch
      if (abortRef.current) abortRef.current.abort();

      if (activeUrls.length === 0) {
        setPreviews([]);
        return;
      }

      // Resolve from cache first
      const cached: LinkPreviewData[] = [];
      const toFetch: string[] = [];
      for (const url of activeUrls) {
        if (ogCache.has(url)) {
          cached.push(ogCache.get(url)!);
        } else {
          toFetch.push(url);
        }
      }

      if (toFetch.length === 0) {
        setPreviews(cached);
        return;
      }

      setIsLoading(true);
      const controller = new AbortController();
      abortRef.current = controller;

      Promise.all(
        toFetch.map((url) => fetchPreview(url, controller.signal))
      ).then((results) => {
        if (controller.signal.aborted) return;
        const fetched = results.filter(Boolean) as LinkPreviewData[];
        // Merge in URL order
        const all: LinkPreviewData[] = [];
        for (const url of activeUrls) {
          const found =
            cached.find((c) => c.url === url) ||
            fetched.find((f) => f.url === url);
          if (found) all.push(found);
        }
        setPreviews(all);
        setIsLoading(false);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, fetchPreview]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const dismiss = useCallback((url: string) => {
    dismissedUrls.current.add(url);
    setPreviews((prev) => prev.filter((p) => p.url !== url));
    prevUrlsRef.current = prevUrlsRef.current.filter((u) => u !== url);
  }, []);

  const getPreviewsForSave = useCallback(() => {
    return previews.filter(
      (p) => p.title || p.description || p.image
    );
  }, [previews]);

  return { previews, isLoading, dismiss, getPreviewsForSave };
}
