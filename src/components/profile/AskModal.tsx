"use client";

import { useState, useEffect } from "react";
import {
  IconX,
  IconMessageQuestion,
  IconSend,
  IconLoader2,
  IconEyeOff,
} from "@tabler/icons-react";
import { sendAsk, canSendAskTo } from "@/actions/asks";
import { toast } from "@/components/ui";

interface AskModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientUsername: string;
  recipientDisplayName?: string;
}

export function AskModal({
  isOpen,
  onClose,
  recipientUsername,
  recipientDisplayName,
}: AskModalProps) {
  const [question, setQuestion] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [canAsk, setCanAsk] = useState(false);
  const [allowsAnonymous, setAllowsAnonymous] = useState(false);
  const [errorReason, setErrorReason] = useState<string | undefined>();

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      canSendAskTo(recipientUsername).then((result) => {
        setCanAsk(result.canAsk);
        setAllowsAnonymous(result.allowsAnonymous);
        setErrorReason(result.reason);
        setIsLoading(false);
      });
    } else {
      // Reset state when modal closes
      setQuestion("");
      setIsAnonymous(false);
      setIsSubmitting(false);
    }
  }, [isOpen, recipientUsername]);

  const handleSubmit = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }

    setIsSubmitting(true);
    const result = await sendAsk(recipientUsername, question.trim(), isAnonymous);

    if (result.success) {
      toast.success("Ask sent!");
      onClose();
    } else {
      toast.error(result.error || "Failed to send ask");
    }

    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-vocl-surface-dark rounded-2xl z-50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-vocl-accent/20 flex items-center justify-center">
              <IconMessageQuestion size={20} className="text-vocl-accent" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Ask a question</h2>
              <p className="text-sm text-foreground/50">
                to {recipientDisplayName || `@${recipientUsername}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 size={24} className="animate-spin text-vocl-accent" />
            </div>
          ) : !canAsk ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <IconMessageQuestion size={24} className="text-foreground/30" />
              </div>
              <p className="text-foreground/60">{errorReason || "Unable to send asks"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What would you like to ask?"
                  rows={4}
                  maxLength={500}
                  className="w-full py-3 px-4 rounded-xl bg-background/50 border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-vocl-accent resize-none"
                />
                <div className="mt-1 text-xs text-foreground/40 text-right">
                  {question.length}/500
                </div>
              </div>

              {/* Anonymous toggle */}
              {allowsAnonymous && (
                <label className="flex items-center gap-3 p-3 rounded-xl bg-background/30 cursor-pointer">
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      isAnonymous ? "bg-vocl-accent" : "bg-white/10"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                        isAnonymous ? "left-6" : "left-1"
                      }`}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-foreground text-sm font-medium">
                      <IconEyeOff size={16} />
                      Ask anonymously
                    </div>
                    <p className="text-foreground/40 text-xs mt-0.5">
                      Your identity will be hidden
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {canAsk && !isLoading && (
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-foreground/60 hover:text-foreground hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !question.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-vocl-accent text-white font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <IconLoader2 size={18} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IconSend size={18} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
