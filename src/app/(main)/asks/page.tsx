"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  IconMessageQuestion,
  IconLoader2,
  IconTrash,
  IconSend,
  IconUserQuestion,
} from "@tabler/icons-react";
import { RichTextEditor } from "@/components/Post/create/RichTextEditor";
import { getMyAsks, answerAsk, deleteAsk } from "@/actions/asks";

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

interface Ask {
  id: string;
  question: string;
  is_anonymous: boolean;
  status: "pending" | "answered" | "deleted";
  created_at: string;
  sender?: {
    id: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function AsksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerContent, setAnswerContent] = useState({ html: "", plain: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAsks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyAsks();
      if (result.success) {
        setAsks(result.asks || []);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAsks();
  }, [fetchAsks]);

  const handleAnswer = async (askId: string) => {
    if (!answerContent.plain.trim()) {
      setError("Please write an answer");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await answerAsk(askId, answerContent.html);

    if (result.success) {
      // Remove the answered ask from the list
      setAsks((prev) => prev.filter((a) => a.id !== askId));
      setAnsweringId(null);
      setAnswerContent({ html: "", plain: "" });
    } else {
      setError(result.error || "Failed to post answer");
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (askId: string) => {
    setDeletingId(askId);

    const result = await deleteAsk(askId);

    if (result.success) {
      setAsks((prev) => prev.filter((a) => a.id !== askId));
    }

    setDeletingId(null);
  };

  const cancelAnswer = () => {
    setAnsweringId(null);
    setAnswerContent({ html: "", plain: "" });
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-vocl-accent/20 flex items-center justify-center">
            <IconMessageQuestion size={24} className="text-vocl-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Ask Inbox</h1>
            {asks.length > 0 && (
              <p className="text-sm text-foreground/50">
                {asks.length} pending ask{asks.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <IconLoader2 size={32} className="animate-spin text-vocl-accent" />
        </div>
      ) : asks.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
            <IconMessageQuestion size={32} className="text-foreground/30" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No asks yet
          </h3>
          <p className="text-foreground/50">
            When someone sends you a question, it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {asks.map((ask) => (
            <div
              key={ask.id}
              className="bg-vocl-surface-dark rounded-2xl overflow-hidden"
            >
              {/* Ask header */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {ask.is_anonymous || !ask.sender ? (
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
                      <IconUserQuestion size={20} className="text-neutral-400" />
                    </div>
                  ) : (
                    <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                      <Image
                        src={`/api/avatar/${ask.sender.id}`}
                        alt={ask.sender.username}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {ask.is_anonymous || !ask.sender
                          ? "Anonymous"
                          : ask.sender.username}
                      </span>
                      <span className="text-xs text-foreground/40">
                        {formatTimeAgo(ask.created_at)}
                      </span>
                    </div>
                    <p className="text-foreground/90 mt-1">{ask.question}</p>
                  </div>
                </div>
              </div>

              {/* Answer section */}
              {answeringId === ask.id ? (
                <div className="p-4 space-y-3">
                  <RichTextEditor
                    placeholder="Write your answer..."
                    onChange={(html, plain) =>
                      setAnswerContent({ html, plain })
                    }
                    minHeight="120px"
                  />

                  {error && (
                    <div className="p-3 rounded-xl bg-vocl-like/20 border border-vocl-like/30 text-vocl-like text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelAnswer}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswer(ask.id)}
                      disabled={isSubmitting || !answerContent.plain.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <IconLoader2 size={18} className="animate-spin" />
                          Posting...
                        </>
                      ) : (
                        <>
                          <IconSend size={18} />
                          Post Answer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(ask.id)}
                    disabled={deletingId === ask.id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-foreground/60 hover:text-vocl-like hover:bg-vocl-like/10 transition-colors disabled:opacity-50"
                  >
                    {deletingId === ask.id ? (
                      <IconLoader2 size={18} className="animate-spin" />
                    ) : (
                      <IconTrash size={18} />
                    )}
                    <span className="hidden sm:inline">Delete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnsweringId(ask.id)}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors"
                  >
                    <IconSend size={18} />
                    Answer
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
