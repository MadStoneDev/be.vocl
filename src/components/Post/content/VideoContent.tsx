"use client";

import { useRef, useState } from "react";
import { IconPlayerPlay, IconPlayerPause, IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { sanitizeHtmlWithSafeLinks } from "@/lib/sanitize";

interface VideoContentProps {
  src: string;
  thumbnailUrl?: string;
  caption?: string;
}

export function VideoContent({ src, thumbnailUrl, caption }: VideoContentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);

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

  return (
    <div className="relative bg-black">
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
