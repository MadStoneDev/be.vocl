"use client";

import { useEffect, useRef, useState } from "react";
import { IconMicrophone, IconPlayerStopFilled, IconLoader2, IconX, IconAlertCircle } from "@tabler/icons-react";

const MAX_DURATION = 60; // seconds

interface Props {
  postId: string;
  onComplete: (url: string, duration: number) => void;
  onCancel: () => void;
}

function pickMimeType(): { mimeType: string; ext: string } {
  const candidates = [
    { mimeType: "audio/webm;codecs=opus", ext: "webm" },
    { mimeType: "audio/webm", ext: "webm" },
    { mimeType: "audio/mp4", ext: "m4a" },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c;
    }
  }
  return { mimeType: "", ext: "webm" };
}

type State = "idle" | "recording" | "uploading" | "error";

export function CommentVoiceRecorder({ postId, onComplete, onCancel }: Props) {
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopAll() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType } = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => upload();

      recorder.start();
      startedAtRef.current = Date.now();
      setSeconds(0);
      setState("recording");
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setSeconds(elapsed);
        if (elapsed >= MAX_DURATION) stop();
      }, 250);
    } catch (e: any) {
      setError(e.name === "NotAllowedError" ? "Mic access denied" : "Recording failed");
      setState("error");
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }

  async function upload() {
    setState("uploading");
    stopAll();
    try {
      const recorder = recorderRef.current!;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      const { ext } = pickMimeType();
      const filename = `voice-comment-${Date.now()}.${ext}`;
      const contentType = blob.type || "audio/webm";

      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType, uploadType: "post-audio", postId }),
      });
      if (!presignRes.ok) throw new Error("Presign failed");
      const { uploadUrl, publicUrl } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": contentType },
      });
      if (!putRes.ok) throw new Error("Upload failed");

      onComplete(publicUrl, seconds);
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 rounded-full">
      {state === "idle" && (
        <>
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-medium"
          >
            <IconMicrophone size={14} /> Start
          </button>
          <span className="text-xs text-neutral-600">Up to {MAX_DURATION}s</span>
          <button type="button" onClick={onCancel} className="ml-auto text-neutral-500 hover:text-rose-500">
            <IconX size={14} />
          </button>
        </>
      )}
      {state === "recording" && (
        <>
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
          </span>
          <span className="text-xs text-neutral-700 font-mono">
            {seconds}s / {MAX_DURATION}s
          </span>
          <button
            type="button"
            onClick={stop}
            className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs"
          >
            <IconPlayerStopFilled size={12} /> Stop
          </button>
        </>
      )}
      {state === "uploading" && (
        <>
          <IconLoader2 size={14} className="animate-spin text-vocl-accent" />
          <span className="text-xs text-neutral-600">Uploading…</span>
        </>
      )}
      {state === "error" && (
        <>
          <IconAlertCircle size={14} className="text-rose-500" />
          <span className="text-xs text-rose-500">{error}</span>
          <button type="button" onClick={onCancel} className="ml-auto text-xs text-neutral-500">
            Cancel
          </button>
        </>
      )}
    </div>
  );
}
