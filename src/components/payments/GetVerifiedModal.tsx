"use client";

import { useState, useCallback } from "react";
import {
  IconX,
  IconRosetteDiscountCheckFilled,
  IconCheck,
  IconLoader2,
  IconShieldCheck,
  IconStar,
  IconTrendingUp,
} from "@tabler/icons-react";
import { initiateVerification, completeVerification } from "@/actions/payments";
import { openPaddleCheckout, VERIFICATION_PRODUCT } from "@/lib/paddle/client";
import { toast } from "@/components/ui";

interface GetVerifiedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BENEFITS = [
  {
    icon: <IconRosetteDiscountCheckFilled size={20} className="text-vocl-accent" />,
    title: "Verified Badge",
    description: "Stand out with a badge next to your name",
  },
  {
    icon: <IconShieldCheck size={20} className="text-vocl-accent" />,
    title: "Authenticity",
    description: "Let others know you're the real deal",
  },
  {
    icon: <IconStar size={20} className="text-vocl-accent" />,
    title: "Priority Support",
    description: "Get faster responses from our team",
  },
  {
    icon: <IconTrendingUp size={20} className="text-vocl-accent" />,
    title: "Increased Visibility",
    description: "Your content may get boosted in discovery",
  },
];

export function GetVerifiedModal({
  isOpen,
  onClose,
  onSuccess,
}: GetVerifiedModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleVerify = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Initiate verification
      const result = await initiateVerification();

      if (!result.success || !result.transactionId) {
        toast.error(result.error || "Failed to start verification");
        setIsProcessing(false);
        return;
      }

      // Get the price ID for verification
      const priceId = process.env.NEXT_PUBLIC_PADDLE_VERIFICATION_PRICE_ID;

      if (!priceId) {
        // Fallback: complete verification directly for demo purposes
        await completeVerification(result.transactionId);
        setIsComplete(true);
        toast.success("You are now verified!");
        setTimeout(() => {
          onSuccess?.();
          onClose();
          setIsComplete(false);
        }, 2000);
        setIsProcessing(false);
        return;
      }

      // Open Paddle checkout
      await openPaddleCheckout({
        items: [{ priceId, quantity: 1 }],
        customData: {
          type: "verification",
          transaction_id: result.transactionId,
        },
        successCallback: async () => {
          setIsComplete(true);
          toast.success("You are now verified!");
          setTimeout(() => {
            onSuccess?.();
            onClose();
            setIsComplete(false);
          }, 2000);
        },
        closeCallback: () => {
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Failed to process verification");
      setIsProcessing(false);
    }
  }, [onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <IconRosetteDiscountCheckFilled
              size={20}
              className="text-vocl-accent"
            />
            <h2 className="font-semibold text-foreground">Get Verified</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-full hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <IconX size={20} className="text-foreground/60" />
          </button>
        </div>

        {isComplete ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-vocl-accent/10 flex items-center justify-center mb-4">
              <IconRosetteDiscountCheckFilled
                size={48}
                className="text-vocl-accent"
              />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              You&apos;re Verified!
            </h3>
            <p className="text-sm text-foreground/50">
              Your verification badge is now active
            </p>
          </div>
        ) : (
          <>
            {/* Hero section */}
            <div className="p-6 text-center bg-gradient-to-b from-vocl-accent/10 to-transparent">
              <div className="w-16 h-16 mx-auto rounded-full bg-vocl-accent/20 flex items-center justify-center mb-4">
                <IconRosetteDiscountCheckFilled
                  size={40}
                  className="text-vocl-accent"
                />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Stand out on be.vocl
              </h3>
              <p className="text-sm text-foreground/60">
                One-time purchase • ${VERIFICATION_PRODUCT.amount}
              </p>
            </div>

            {/* Benefits */}
            <div className="p-4 space-y-3">
              {BENEFITS.map((benefit, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-vocl-surface-dark/50"
                >
                  <div className="mt-0.5">{benefit.icon}</div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {benefit.title}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleVerify}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-vocl-accent text-white font-semibold hover:bg-vocl-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <IconLoader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <IconCheck size={20} />
                    Get Verified for ${VERIFICATION_PRODUCT.amount}
                  </>
                )}
              </button>
              <p className="text-xs text-foreground/40 text-center mt-3">
                Secure payment powered by Paddle
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
