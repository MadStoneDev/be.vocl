"use client";

import { useRef, useState } from "react";
import { IconPlayerPlay, IconPlayerPause, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";
import type { VideoEmbedPlatform } from "@/types/database";

interface VideoContentProps {
  // For direct file uploads
  src?: string;
  thumbnailUrl?: string;
  // For embeds
  embedUrl?: string;
  embedPlatform?: VideoEmbedPlatform;
  // Common
  caption?: string;
  /** Broadsheet article mode: serif figcaption (no gray box). */
  article?: boolean;
  /** Full-viewport hero — only safe in the viewport-centered (logged-out) view. */
  fullBleed?: boolean;
}

export function VideoContent({
  src,
  thumbnailUrl,
  embedUrl,
  embedPlatform,
  caption,
  article,
  fullBleed,
}: VideoContentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Determine if this is an embed or direct file
  const isEmbed = !!embedUrl;

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Generate embed iframe URL with proper parameters
  const getEmbedIframeUrl = () => {
    if (!embedUrl) return "";

    // Add autoplay=0 and other parameters based on platform
    const url = new URL(embedUrl);

    switch (embedPlatform) {
      case "youtube":
        url.searchParams.set("rel", "0"); // Don't show related videos from other channels
        url.searchParams.set("modestbranding", "1"); // Minimal YouTube branding
        break;
      case "vimeo":
        url.searchParams.set("byline", "0");
        url.searchParams.set("portrait", "0");
        break;
      case "dailymotion":
        url.searchParams.set("ui-logo", "0");
        break;
      // Rumble doesn't need special params
    }

    return url.toString();
  };

  const player = (
    <>
      {isEmbed ? (
        // Embedded video player (YouTube, Vimeo, etc.)
        <div className="relative aspect-video">
          <iframe
            src={getEmbedIframeUrl()}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`${embedPlatform || "Video"} embed`}
          />
        </div>
      ) : src ? (
        // Direct video file
        <div
          className="relative aspect-video cursor-pointer"
          onClick={togglePlay}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(isPlaying ? false : true)}
        >
          <video
            ref={videoRef}
            src={src}
            poster={thumbnailUrl}
            className="w-full h-full object-contain"
            muted={isMuted}
            loop
            playsInline
            onEnded={() => setIsPlaying(false)}
          />

          {/* Play/Pause overlay */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity ${
              showControls || !isPlaying ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              {isPlaying ? (
                <IconPlayerPause size={32} className="text-white" />
              ) : (
                <IconPlayerPlay size={32} className="text-white ml-1" />
              )}
            </div>
          </div>

          {/* Mute button */}
          <button
            type="button"
            onClick={toggleMute}
            className={`absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white transition-opacity ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            {isMuted ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}
          </button>
        </div>
      ) : (
        // Fallback for missing video
        <div className="aspect-video flex items-center justify-center bg-neutral-900">
          <p className="text-foreground/40">Video unavailable</p>
        </div>
      )}
    </>
  );

  // Broadsheet article: full-bleed (guest) player + serif italic figcaption.
  if (article) {
    return (
      <figure className="my-6">
        <div
          className={`relative bg-black ${
            fullBleed ? "left-1/2 right-1/2 -mx-[50vw] w-screen max-w-[100vw]" : "w-full"
          }`}
        >
          {player}
        </div>
        {caption && (
          <figcaption
            className="mx-auto max-w-2xl px-4 pt-3 font-serif italic text-sm text-foreground/55 text-center [&_*]:inline"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
          />
        )}
      </figure>
    );
  }

  return (
    <div className="relative bg-black">
      {player}

      {/* Caption */}
      {caption && (
        <div
          className="px-2.5 pt-2.5 pb-2.5 sm:p-4 text-foreground/75 prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_p:empty]:before:content-['\00a0']"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
        />
      )}
    </div>
  );
}
