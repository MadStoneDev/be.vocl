"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { IconSearch, IconLoader2, IconX, IconGif } from "@tabler/icons-react";

interface Gif {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
}

interface GifPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gifUrl: string) => void;
}

export function GifPicker({ isOpen, onClose, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [nextPos, setNextPos] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch GIFs
  const fetchGifs = useCallback(async (searchQuery: string, pos = "") => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (pos) params.set("pos", pos);
      params.set("limit", "20");

      const response = await fetch(`/api/gifs?${params}`);
      const data = await response.json();

      if (pos) {
        setGifs((prev) => [...prev, ...data.gifs]);
      } else {
        setGifs(data.gifs);
      }
      setNextPos(data.next || "");
    } catch (error) {
      console.error("Failed to fetch GIFs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load trending GIFs on open
  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      fetchGifs("");
    }
  }, [isOpen, gifs.length, fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, fetchGifs]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!containerRef.current || isLoading || !nextPos) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      fetchGifs(query, nextPos);
    }
  }, [isLoading, nextPos, query, fetchGifs]);

  const handleSelect = (gif: Gif) => {
    onSelect(gif.url);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-vocl-surface-dark border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <IconGif size={20} className="text-vocl-accent" />
          <span className="font-medium text-foreground text-sm">GIFs</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <IconX size={18} className="text-foreground/60" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-white/5">
        <div className="relative">
          <IconSearch
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full py-2 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-1 focus:ring-vocl-accent text-sm"
            autoFocus
          />
        </div>
      </div>

      {/* GIF Grid */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-64 overflow-y-auto p-2"
      >
        {gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleSelect(gif)}
                className="relative aspect-square rounded-lg overflow-hidden bg-white/5 hover:ring-2 hover:ring-vocl-accent transition-all"
              >
                <Image
                  src={gif.previewUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <IconLoader2 size={24} className="animate-spin text-vocl-accent" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-foreground/50 text-sm">
            {query ? "No GIFs found" : "Start searching for GIFs"}
          </div>
        )}

        {/* Loading more indicator */}
        {isLoading && gifs.length > 0 && (
          <div className="flex justify-center py-4">
            <IconLoader2 size={20} className="animate-spin text-vocl-accent" />
          </div>
        )}
      </div>

      {/* Powered by Tenor */}
      <div className="px-3 py-2 border-t border-white/5 text-center">
        <span className="text-[10px] text-foreground/30">Powered by Tenor</span>
      </div>
    </div>
  );
}
