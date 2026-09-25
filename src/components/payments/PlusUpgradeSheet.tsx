"use client";

import { useState, useCallback, useEffect } from "react";
import { IconX, IconLoader2 } from "@tabler/icons-react";
import { getPlusCheckoutInfo } from "@/actions/editions";
import { openPaddleCheckout } from "@/lib/paddle/client";
import { getEdition } from "@/editions/registry";
import { loadEditionFonts } from "@/editions/fonts";
import { Portal, toast } from "@/components/ui";

interface PlusUpgradeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** The edition the user tried to Apply — the sheet renders in it so they see what they're buying. */
  editionId: string;
  /** Called after checkout succeeds (apply the pending edition). */
  onSuccess?: () => void;
}

const PLUS_LINES = [
  "24 Plus editions",
  "Custom accent & nameplate",
  "Write your own masthead line",
];

export function PlusUpgradeSheet({
  isOpen,
  onClose,
  editionId,
  onSuccess,
}: PlusUpgradeSheetProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const edition = getEdition(editionId);

  useEffect(() => {
    if (isOpen && edition) loadEditionFonts(edition.id);
  }, [isOpen, edition?.id]);

  const handleGetPlus = useCallback(async () => {
    setIsProcessing(true);
    try {
      const info = await getPlusCheckoutInfo();
      if (!info.success || !info.userId) {
        toast.error(info.error || "Please sign in to upgrade");
        setIsProcessing(false);
        return;
      }
      if (info.alreadyPlus) {
        toast.success("You already have Plus");
        onSuccess?.();
        onClose();
        return;
      }

      const priceId = process.env.NEXT_PUBLIC_PADDLE_PLUS_PRICE_ID;
      if (!priceId) {
        // No self-grant fallback (mirrors the verification flow): entitlement is
        // only ever granted by the Paddle subscription webhook after real payment.
        toast.error("Plus is temporarily unavailable. Please try again later.");
        setIsProcessing(false);
        return;
      }

      await openPaddleCheckout({
        items: [{ priceId, quantity: 1 }],
        customData: { type: "plus", user_id: info.userId },
        successCallback: async () => {
          // The webhook grants the entitlement; give it a beat, then apply.
          toast.success("Welcome to Plus!");
          setTimeout(() => {
            onSuccess?.();
            onClose();
            setIsProcessing(false);
          }, 1500);
        },
        closeCallback: () => setIsProcessing(false),
      });
    } catch (error) {
      console.error("Plus checkout error:", error);
      toast.error("Failed to start checkout");
      setIsProcessing(false);
    }
  }, [onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Rendered in the previewed edition so the sheet shows what's being bought. */}
        <div
          data-edition={edition?.id}
          className="relative w-full sm:max-w-md bg-paper border border-rule overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-rule">
            <span className="kicker kicker-accent">be.vocl Plus</span>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 hover:bg-vocl-hover transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <IconX size={20} className="text-meta" />
            </button>
          </div>

          <div className="p-6">
            <h2 className="type-display font-nameplate text-ink mb-5">
              Print in {edition?.name ?? "this edition"}
            </h2>

            <ul className="mb-6">
              {PLUS_LINES.map((line) => (
                <li
                  key={line}
                  className="editorial-body text-editorial-body py-3 border-t border-rule last:border-b"
                >
                  {line}
                </li>
              ))}
            </ul>

            <button
              onClick={handleGetPlus}
              disabled={isProcessing}
              className="w-full py-3 bg-accent text-on-accent byline hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  PROCESSING…
                </>
              ) : (
                "GET PLUS"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full mt-3 slug text-meta hover:text-ink transition-colors disabled:opacity-50"
            >
              Not now
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
