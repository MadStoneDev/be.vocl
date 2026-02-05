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
}

export function VideoContent({
  src,
  thumbnailUrl,
  embedUrl,
  embedPlatform,
  caption
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

  return (
    <div className="relative bg-black">
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

      {/* Caption */}
      {caption && (
        <div
          className="p-4 bg-[#EBEBEB] text-neutral-700"
          dangerouslySetInnerHTML={{ __html: sanitizeHtmlWithSafeLinks(caption) }}
        />
      )}
    </div>
  );
}
