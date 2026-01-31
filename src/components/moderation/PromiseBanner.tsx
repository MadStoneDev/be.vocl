"use client";

import { useState } from "react";
import { IconShieldCheck, IconAlertTriangle } from "@tabler/icons-react";
import { acceptContentPromise } from "@/actions/account";

interface PromiseBannerProps {
  onAccepted?: () => void;
}

export function PromiseBanner({ onAccepted }: PromiseBannerProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsAccepting(true);
    setError(null);

    const result = await acceptContentPromise();

    if (result.success) {
      onAccepted?.();
    } else {
      setError(result.error || "Failed to accept. Please try again.");
    }

    setIsAccepting(false);
  };

  return (
    <div className="bg-gradient-to-r from-vocl-accent/10 to-amber-500/10 border border-vocl-accent/20 rounded-2xl p-5 mb-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-vocl-accent/20 flex items-center justify-center">
          <IconShieldCheck size={24} className="text-vocl-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Community Promise
          </h3>

          <p className="text-sm text-foreground/70 mb-4 leading-relaxed">
            be.vocl values creative freedom, but has{" "}
            <span className="font-semibold text-vocl-like">zero tolerance</span>{" "}
            for illegal content—especially anything harmful to minors.
          </p>

          <div className="bg-background/50 rounded-xl p-4 mb-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <IconAlertTriangle size={16} className="text-amber-500" />
              <span className="text-sm font-medium text-foreground">
                By continuing, I acknowledge that:
              </span>
            </div>
            <ul className="text-sm text-foreground/60 space-y-1 ml-6">
              <li>
                • I will never post content that presents harm to children in
                any context
              </li>
              <li>
                • Violations may result in permanent ban and IP logging
              </li>
              <li>
                • I have read and agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  className="text-vocl-accent hover:underline"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {error && (
            <p className="text-sm text-vocl-like mb-3">{error}</p>
          )}

          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="px-6 py-2.5 bg-vocl-accent text-white rounded-xl font-medium hover:bg-vocl-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAccepting ? "Accepting..." : "I Understand & Agree"}
          </button>
        </div>
      </div>
    </div>
  );
}
