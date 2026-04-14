"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconMicrophone,
  IconPlayerStopFilled,
  IconPlayerPlay,
  IconPlayerPause,
  IconTrash,
  IconLoader2,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";

const MAX_DURATION_SECONDS = 300; // 5 minutes

interface VoiceRecorderProps {
  postId: string;
  onComplete: (url: string, duration: number) => void;
  onClear: () => void;
  uploadedUrl: string | null;
}

type RecorderState = "idle" | "recording" | "preview" | "uploading" | "uploaded" | "error";

function pickMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", ext: "webm" },
    { mimeType: "audio/webm", ext: "webm" },
    { mimeType: "audio/mp4", ext: "m4a" },
    { mimeType: "audio/aac", ext: "m4a" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "", ext: "webm" };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ postId, onComplete, onClear, uploadedUrl }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>(uploadedUrl ? "uploaded" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level meter
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AC();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 3));
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Recorder
      const { mimeType } = pickMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setState("preview");
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      startedAtRef.current = Date.now();
      setSeconds(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch (e: any) {
      setError(
        e.name === "NotAllowedError"
          ? "Microphone access denied. Allow mic access in your browser settings."
          : e.message || "Failed to start recording"
      );
      setState("error");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function discard() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    blobRef.current = null;
    setSeconds(0);
    setLevel(0);
    setIsPlaying(false);
    setState("idle");
    onClear();
  }

  function togglePreview() {
    if (!previewAudioRef.current) return;
    if (isPlaying) {
      previewAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      previewAudioRef.current.play();
      setIsPlaying(true);
    }
  }

  async function uploadRecording() {
    if (!blobRef.current) return;
    setState("uploading");
    setError(null);

    try {
      const { ext } = pickMimeType();
      const filename = `voice-${Date.now()}.${ext}`;
      const contentType = blobRef.current.type || "audio/webm";

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType,
          uploadType: "post-audio",
          postId,
        }),
      });
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, publicUrl } = await presignRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: blobRef.current,
        headers: { "Content-Type": contentType },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      onComplete(publicUrl, seconds);
      setState("uploaded");
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setState("error");
    }
  }

  return (
    <div className="space-y-3">
      {state === "idle" && (
        <div className="rounded-xl bg-background/50 border border-white/10 p-6 text-center">
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex flex-col items-center gap-2 group"
          >
            <span className="w-16 h-16 rounded-full bg-vocl-accent/20 group-hover:bg-vocl-accent/30 transition-colors flex items-center justify-center">
              <IconMicrophone size={28} className="text-vocl-accent" />
            </span>
            <span className="text-sm font-medium text-foreground">Start recording</span>
          </button>
          <p className="text-xs text-foreground/40 mt-2">
            Up to {MAX_DURATION_SECONDS / 60} minutes
          </p>
        </div>
      )}

      {state === "recording" && (
        <div className="rounded-xl bg-background/50 border border-rose-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <span className="text-sm font-medium text-foreground">Recording…</span>
            </div>
            <span className="font-mono text-sm text-foreground/70">
              {formatTime(seconds)} / {formatTime(MAX_DURATION_SECONDS)}
            </span>
          </div>

          <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 transition-[width]"
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </div>

          <button
            type="button"
            onClick={stopRecording}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 transition-colors"
          >
            <IconPlayerStopFilled size={18} /> Stop
          </button>
        </div>
      )}

      {state === "preview" && previewUrl && (
        <div className="rounded-xl bg-background/50 border border-white/10 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePreview}
              className="w-10 h-10 rounded-full bg-vocl-accent text-white flex items-center justify-center hover:bg-vocl-accent-hover transition-colors"
            >
              {isPlaying ? <IconPlayerPause size={18} /> : <IconPlayerPlay size={18} />}
            </button>
            <span className="font-mono text-sm text-foreground/80">{formatTime(seconds)}</span>
            <audio
              ref={previewAudioRef}
              src={previewUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="flex-1" />
            <button
              type="button"
              onClick={discard}
              className="w-9 h-9 rounded-lg text-foreground/60 hover:bg-rose-500/10 hover:text-rose-400 transition-colors flex items-center justify-center"
              title="Discard and re-record"
            >
              <IconTrash size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={uploadRecording}
            className="w-full px-4 py-2 rounded-xl bg-vocl-accent text-white text-sm font-medium hover:bg-vocl-accent-hover"
          >
            Use this recording
          </button>
        </div>
      )}

      {state === "uploading" && (
        <div className="rounded-xl bg-background/50 border border-white/10 p-6 text-center">
          <IconLoader2 size={24} className="animate-spin text-vocl-accent mx-auto mb-2" />
          <p className="text-sm text-foreground/70">Uploading…</p>
        </div>
      )}

      {state === "uploaded" && uploadedUrl && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-300">
            <IconCheck size={18} />
            Recording ready ({formatTime(seconds)})
          </div>
          <button
            type="button"
            onClick={discard}
            className="text-xs text-foreground/60 hover:text-rose-400"
          >
            Re-record
          </button>
        </div>
      )}

      {state === "error" && error && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-rose-300">
            <IconAlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="text-xs text-foreground/60 hover:text-foreground"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
