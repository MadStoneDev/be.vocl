"use client";

import { useState, useRef, useEffect } from "react";
import {
  IconSend,
  IconPhoto,
  IconMoodSmile,
  IconGif,
  IconX,
  IconLoader2,
} from "@tabler/icons-react";
import Image from "next/image";
import { GifPicker } from "./GifPicker";
import { EmojiPicker } from "./EmojiPicker";

interface ChatInputProps {
  onSend: (content: string, mediaFile?: File) => Promise<void>;
  onSendGif?: (gifUrl: string) => Promise<void>;
  onTyping?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  onSendGif,
  onTyping,
  disabled = false,
  placeholder = "Type a message...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Handle typing indicator
  const handleChange = (value: string) => {
    setMessage(value);

    // Debounce typing indicator
    if (onTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        // Stop typing after 2 seconds of inactivity
      }, 2000);
    }
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
      await onSend(message.trim(), mediaFile || undefined);
      setMessage("");
      handleClearMedia();
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

  return (
    <div className="border-t border-white/5 p-3">
      {/* Media preview */}
      {mediaPreview && (
        <div className="relative inline-block mb-3">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden">
            <Image
              src={mediaPreview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <button
            onClick={handleClearMedia}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-vocl-like text-white flex items-center justify-center shadow-lg"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="relative flex items-end gap-2">
        {/* GIF Picker */}
        <GifPicker
          isOpen={showGifPicker}
          onClose={() => setShowGifPicker(false)}
          onSelect={handleGifSelect}
        />

        {/* Media button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSending}
          className="flex-shrink-0 p-2.5 rounded-xl text-foreground/50 hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-50"
          title="Upload image or video"
        >
          <IconPhoto size={20} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* GIF button */}
        <button
          type="button"
          onClick={() => {
            setShowGifPicker(!showGifPicker);
            setShowEmojiPicker(false);
          }}
          disabled={disabled || isSending}
          className={`flex-shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-50 ${
            showGifPicker
              ? "bg-vocl-accent text-white"
              : "text-foreground/50 hover:text-foreground hover:bg-white/5"
          }`}
          title="Send a GIF"
        >
          <IconGif size={20} />
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isSending}
            rows={1}
            className="w-full py-2.5 px-4 pr-10 rounded-xl bg-vocl-surface-dark border border-white/5 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent transition-colors text-sm resize-none disabled:opacity-50"
            style={{ maxHeight: "120px" }}
          />
          {/* Emoji button and picker */}
          <div className="absolute right-3 bottom-2.5">
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
              className={`transition-colors ${
                showEmojiPicker
                  ? "text-vocl-accent"
                  : "text-foreground/40 hover:text-foreground"
              }`}
            >
              <IconMoodSmile size={18} />
            </button>
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!message.trim() && !mediaFile) || disabled || isSending}
          className="flex-shrink-0 p-2.5 rounded-xl bg-vocl-accent text-white hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? (
            <IconLoader2 size={20} className="animate-spin" />
          ) : (
            <IconSend size={20} />
          )}
        </button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-foreground/30 mt-2 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
