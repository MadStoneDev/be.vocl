"use client";

import { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolumeOff,
  IconMusic,
} from "@tabler/icons-react";

interface SpotifyData {
  track_id: string;
  name: string;
  artist: string;
  album: string;
}

interface AudioContentProps {
  src: string;
  albumArtUrl?: string;
  spotifyData?: SpotifyData;
  caption?: string;
}

export function AudioContent({
  src,
  albumArtUrl,
  spotifyData,
  caption,
}: AudioContentProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      audioRef.current.currentTime = percent * duration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gradient-to-br from-vocl-surface-dark to-background p-6">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex gap-4">
        {/* Album Art */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-vocl-surface-dark flex-shrink-0">
          {albumArtUrl ? (
            <Image src={albumArtUrl} alt="Album art" fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <IconMusic size={40} className="text-foreground/20" />
            </div>
          )}

          {/* Play button overlay */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              {isPlaying ? (
                <IconPlayerPause size={24} className="text-neutral-900" />
              ) : (
                <IconPlayerPlay size={24} className="text-neutral-900 ml-0.5" />
              )}
            </div>
          </button>
        </div>

        {/* Track Info & Controls */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          {spotifyData ? (
            <>
              <h3 className="font-semibold text-foreground truncate">
                {spotifyData.name}
              </h3>
              <p className="text-foreground/60 text-sm truncate">
                {spotifyData.artist}
              </p>
              <p className="text-foreground/40 text-xs truncate">
                {spotifyData.album}
              </p>
            </>
          ) : (
            <h3 className="font-semibold text-foreground">Audio Track</h3>
          )}

          {/* Progress bar */}
          <div className="mt-3 space-y-1">
            <div
              className="h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="h-full bg-vocl-accent transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-foreground/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <button
            type="button"
            onClick={toggleMute}
            className="mt-2 self-start p-1.5 rounded-lg text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {isMuted ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
          </button>
        </div>
      </div>

      {/* Caption */}
      {caption && (
        <div
          className="mt-4 pt-4 border-t border-white/10 text-foreground/80"
          dangerouslySetInnerHTML={{ __html: caption }}
        />
      )}
    </div>
  );
}
