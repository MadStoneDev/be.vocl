"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import {
  IconX,
  IconCoin,
  IconHeart,
  IconSparkles,
  IconLoader2,
  IconCheck,
} from "@tabler/icons-react";
import { initiateTip, completeTip } from "@/actions/payments";
import { openPaddleCheckout, TIP_PRODUCTS } from "@/lib/paddle/client";
import { toast } from "@/components/ui";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

type TipTier = "small" | "medium" | "large";

const TIP_TIERS: Array<{
  id: TipTier;
  icon: React.ReactNode;
  amount: number;
  label: string;
}> = [
  {
    id: "small",
    icon: <IconCoin size={24} />,
    amount: TIP_PRODUCTS.small.amount,
    label: "Coffee",
  },
  {
    id: "medium",
    icon: <IconHeart size={24} />,
    amount: TIP_PRODUCTS.medium.amount,
    label: "Support",
  },
  {
    id: "large",
    icon: <IconSparkles size={24} />,
    amount: TIP_PRODUCTS.large.amount,
    label: "Wow!",
  },
];

export function TipModal({ isOpen, onClose, recipient }: TipModalProps) {
  const [selectedTier, setSelectedTier] = useState<TipTier | null>(null);
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleTip = useCallback(async () => {
    if (!selectedTier) {
      toast.error("Please select a tip amount");
      return;
    }

    setIsProcessing(true);

    try {
      // Initiate the tip
      const result = await initiateTip(recipient.id, selectedTier, message);

      if (!result.success || !result.transactionId) {
        toast.error(result.error || "Failed to process tip");
        setIsProcessing(false);
        return;
      }

      // Get the price ID for the selected tier
      const priceId = process.env[`NEXT_PUBLIC_PADDLE_TIP_${selectedTier.toUpperCase()}_PRICE_ID`];

      if (!priceId) {
        // Fallback: complete the tip directly for demo purposes
        await completeTip(result.transactionId);
        setIsComplete(true);
        toast.success(`You tipped $${TIP_PRODUCTS[selectedTier].amount} to @${recipient.username}!`);
        setTimeout(() => {
          onClose();
          setIsComplete(false);
          setSelectedTier(null);
          setMessage("");
        }, 2000);
        setIsProcessing(false);
        return;
      }

      // Open Paddle checkout
      await openPaddleCheckout({
        items: [{ priceId, quantity: 1 }],
        customData: {
          type: "tip",
          transaction_id: result.transactionId,
          recipient_id: recipient.id,
          sender_message: message,
        },
        successCallback: async () => {
          // Payment successful - webhook will handle the rest
          setIsComplete(true);
          toast.success(`You tipped $${TIP_PRODUCTS[selectedTier].amount} to @${recipient.username}!`);
          setTimeout(() => {
            onClose();
            setIsComplete(false);
            setSelectedTier(null);
            setMessage("");
          }, 2000);
        },
        closeCallback: () => {
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Tip error:", error);
      toast.error("Failed to process tip");
      setIsProcessing(false);
    }
  }, [selectedTier, message, recipient, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconCoin size={20} className="text-yellow-500" />
            <h2 className="font-semibold text-foreground">Send a Tip</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <IconX size={20} className="text-foreground/60" />
          </button>
        </div>

        {/* Recipient info */}
        <div className="flex items-center gap-3 p-4 bg-vocl-surface-dark/50">
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
            {recipient.avatarUrl ? (
              <Image
                src={recipient.avatarUrl}
                alt={recipient.username}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-vocl-accent to-vocl-accent-hover flex items-center justify-center">
                <span className="text-white font-bold">
                  {recipient.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {recipient.displayName || recipient.username}
            </p>
            <p className="text-sm text-foreground/50">@{recipient.username}</p>
          </div>
        </div>

        {isComplete ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <IconCheck size={32} className="text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Tip Sent!
            </h3>
            <p className="text-sm text-foreground/50">
              Thank you for supporting @{recipient.username}
            </p>
          </div>
        ) : (
          <>
            {/* Tip tiers */}
            <div className="p-4">
              <p className="text-sm text-foreground/60 mb-3">
                Choose an amount
              </p>
              <div className="grid grid-cols-3 gap-2">
                {TIP_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTier(tier.id)}
                    disabled={isProcessing}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedTier === tier.id
                        ? "border-vocl-accent bg-vocl-accent/10"
                        : "border-white/10 hover:border-white/20 bg-vocl-surface-dark"
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`mb-2 ${
                        selectedTier === tier.id
                          ? "text-vocl-accent"
                          : "text-foreground/60"
                      }`}
                    >
                      {tier.icon}
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      ${tier.amount}
                    </p>
                    <p className="text-xs text-foreground/50">{tier.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional message */}
            <div className="px-4 pb-4">
              <label className="block text-sm text-foreground/60 mb-2">
                Add a message (optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something nice..."
                maxLength={280}
                rows={2}
                disabled={isProcessing}
                className="w-full px-3 py-2 rounded-xl bg-vocl-surface-dark border border-white/10 text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-vocl-accent resize-none disabled:opacity-50"
              />
            </div>

            {/* Submit button */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleTip}
                disabled={!selectedTier || isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <IconLoader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : selectedTier ? (
                  <>
                    <IconCoin size={20} />
                    Send ${TIP_PRODUCTS[selectedTier].amount} Tip
                  </>
                ) : (
                  "Select an amount"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
