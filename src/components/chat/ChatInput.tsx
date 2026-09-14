"use client";

import { useState, useRef, useEffect } from "react";
import { IconMoodSmile, IconX, IconLoader2 } from "@tabler/icons-react";
import { toast } from "@/components/ui";
import Image from "next/image";
import { GifPicker } from "./GifPicker";
import { EmojiPicker } from "./EmojiPicker";
import { VoiceRecorder } from "@/components/Post/create/VoiceRecorder";

interface ReplyingTo {
  id: string;
  senderName: string;
  preview: string;
}

interface ChatInputProps {
  /** Conversation id, used as the upload scope for voice notes. */
  conversationId: string;
  onSend: (content: string, mediaFile?: File) => Promise<boolean | void>;
  onSendGif?: (gifUrl: string) => Promise<void>;
  onSendVoice?: (url: string, duration: number) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
  /** When set, shows a "replying to" banner above the input. */
  replyingTo?: ReplyingTo | null;
  onCancelReply?: () => void;
}

export function ChatInput({
  conversationId,
  onSend,
  onSendGif,
  onSendVoice,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
  replyingTo,
  onCancelReply,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle GIF selection
  const handleGifSelect = async (gifUrl: string) => {
    if (onSendGif) {
      setIsSending(true);
      try {
        await onSendGif(gifUrl);
      } finally {
        setIsSending(false);
      }
    } else {
      // Fallback: send as a message with the GIF URL
      setIsSending(true);
      try {
        await onSend(gifUrl);
      } finally {
        setIsSending(false);
      }
    }
  };

  // Handle a completed voice recording (already uploaded by VoiceRecorder).
  const handleVoiceComplete = async (url: string, duration: number) => {
    setShowVoiceRecorder(false);
    if (onSendVoice) {
      setIsSending(true);
      try {
        await onSendVoice(url, duration);
      } finally {
        setIsSending(false);
      }
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    // Insert emoji at cursor position
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newMessage = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newMessage);
      // Move cursor after emoji
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length;
        input.focus();
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Refresh the typing indicator on each keystroke. Stop-typing is driven by
  // useTypingPresence's own inactivity timer, so no local timeout is needed.
  const handleChange = (value: string) => {
    setMessage(value);
    onTyping?.();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const url = URL.createObjectURL(file);
      setMediaPreview(url);
    }
  };

  // Clear media
  const handleClearMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle send
  const handleSend = async () => {
    if ((!message.trim() && !mediaFile) || disabled || isSending) return;

    setIsSending(true);
    try {
      const ok = await onSend(message.trim(), mediaFile || undefined);
      // Keep the typed text + media if the send failed, so it can be retried.
      if (ok === false) return;
      setMessage("");
      handleClearMedia();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const actionClass = (active?: boolean) =>
    `byline transition-colors disabled:opacity-40 ${active ? "text-accent" : "text-meta hover:text-accent"}`;

  return (
    <div className="rule-double px-5 md:px-10 pt-5 pb-6">
      {/* Replying-to banner */}
      {replyingTo && (
        <div className="mb-3 flex items-center gap-2 border-l-2 border-accent py-1 pl-3">
          <div className="min-w-0 flex-1">
            <p className="byline text-accent">Replying to {replyingTo.senderName}</p>
            <p className="editorial-body truncate text-[0.9rem] text-meta">{replyingTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="flex-shrink-0 text-meta hover:text-ink transition-colors"
          >
            <IconX size={16} />
          </button>
        </div>
      )}

      {/* Voice recorder */}
      {showVoiceRecorder && (
        <div className="mb-3">
          <VoiceRecorder
            postId={conversationId}
            uploadedUrl={null}
            onComplete={handleVoiceComplete}
            onClear={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Media preview */}
      {mediaPreview && (
        <div className="relative mb-3 inline-block">
          <div className="relative h-20 w-20 overflow-hidden">
            <Image src={mediaPreview} alt="Preview" fill className="object-cover" />
          </div>
          <button
            onClick={handleClearMedia}
            aria-label="Remove attachment"
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center bg-accent text-white"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      <GifPicker isOpen={showGifPicker} onClose={() => setShowGifPicker(false)} onSelect={handleGifSelect} />

      {/* Growing serif field — no box */}
      <textarea
        ref={inputRef}
        value={message}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isSending}
        rows={1}
        className="w-full max-w-[62ch] resize-none border-0 bg-transparent font-serif text-[17px] leading-[1.6] text-ink placeholder:italic placeholder:text-meta-dim focus:outline-none disabled:opacity-50"
        style={{ maxHeight: "160px" }}
      />

      {/* Action row */}
      <div className="mt-2 flex items-center gap-5 border-t border-rule pt-3.5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className={actionClass()}
        >
          Attach photo
        </button>
        <button
          type="button"
          onClick={() => {
            setShowGifPicker(!showGifPicker);
            setShowEmojiPicker(false);
          }}
          disabled={disabled || isSending}
          className={actionClass(showGifPicker)}
        >
          GIF
        </button>
        <button
          type="button"
          onClick={() => {
            setShowVoiceRecorder((v) => !v);
            setShowGifPicker(false);
            setShowEmojiPicker(false);
          }}
          disabled={disabled || isSending}
          className={actionClass(showVoiceRecorder)}
        >
          Voice
        </button>
        <div className="relative">
          <EmojiPicker
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={handleEmojiSelect}
          />
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowGifPicker(false);
            }}
            aria-label="Add emoji"
            className={showEmojiPicker ? "text-accent" : "text-meta hover:text-accent transition-colors"}
          >
            <IconMoodSmile size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && !mediaFile) || disabled || isSending}
          className="ml-auto inline-flex items-center gap-2 bg-accent px-6 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-[0.88] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending && <IconLoader2 size={14} className="animate-spin" />}
          Send
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
