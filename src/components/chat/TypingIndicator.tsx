"use client";

interface TypingIndicatorProps {
  username: string;
}

export function TypingIndicator({ username }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        <span
          className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-2 h-2 rounded-full bg-foreground/30 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
      <span className="text-xs text-foreground/40">
        {username} is typing...
      </span>
    </div>
  );
}
