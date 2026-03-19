"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import { ImageLightbox } from "./ImageLightbox";

// Clamp aspect ratio between 4:5 (portrait) and 2:1 (landscape)
const MIN_ASPECT = 4 / 5;
const MAX_ASPECT = 2 / 1;
const DEFAULT_ASPECT = 4 / 3;

interface GalleryContentProps {
  images: string[];
  caption?: string;
  alt?: string;
}

export function GalleryContent({ images, caption, alt = "Gallery image" }: GalleryContentProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<number, number>>({});

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleImageLoad = useCallback((index: number, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      const natural = img.naturalWidth / img.naturalHeight;
      const clamped = Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, natural));
      setAspectRatios((prev) => ({ ...prev, [index]: clamped }));
    }
  }, []);

  const scrollBy = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // For single images, use that image's ratio; for multi, use the current image's ratio or default
  const containerAspect = images.length === 1
    ? (aspectRatios[0] ?? DEFAULT_ASPECT)
    : (aspectRatios[currentIndex] ?? DEFAULT_ASPECT);

  return (
    <>
      <div className="bg-black/5 relative group">
        {/* Carousel Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => scrollBy("left")}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="Scroll left"
            >
              <IconChevronLeft size={20} />
            </button>
            <button
              onClick={() => scrollBy("right")}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
              aria-label="Scroll right"
            >
              <IconChevronRight size={20} />
            </button>
          </>
        )}

        {/* Horizontal Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {images.map((src, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 snap-center cursor-pointer"
              style={{
                width: images.length === 1 ? "100%" : "85%",
                maxWidth: images.length === 1 ? "100%" : "400px"
              }}
              onClick={() => openLightbox(index)}
            >
              <div
                className="relative w-full overflow-hidden"
                style={{ aspectRatio: `${aspectRatios[index] ?? DEFAULT_ASPECT}` }}
              >
                <Image
                  src={src}
                  alt={`${alt} ${index + 1}`}
                  fill
                  className="object-cover hover:brightness-95 transition-all"
                  onLoad={(e) => handleImageLoad(index, e)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Image Indicator Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/40">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  if (scrollContainerRef.current) {
                    const container = scrollContainerRef.current;
                    const itemWidth = container.scrollWidth / images.length;
                    container.scrollTo({
                      left: itemWidth * index,
                      behavior: "smooth",
                    });
                  }
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === 0 ? "bg-white" : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Caption */}
        {caption && (
          <div
            className="px-2.5 pt-2.5 pb-2.5 sm:p-4 bg-[#EBEBEB] text-neutral-700 prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p:empty]:before:content-['\00a0']"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
          />
        )}
      </div>

      {/* Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={currentIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setCurrentIndex}
        alt={alt}
      />
    </>
  );
}
