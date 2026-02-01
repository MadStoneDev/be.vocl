"use client";

import { useState, useEffect } from "react";
import { IconShieldCheckFilled, IconX } from "@tabler/icons-react";

const STORAGE_KEY = "bevocl_security_warning_seen";

interface SecurityWarningModalProps {
  isAuthenticated: boolean;
}

/**
 * Security warning modal shown once after login
 * Warns users about scammers impersonating staff
 */
export function SecurityWarningModal({ isAuthenticated }: SecurityWarningModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const hasSeenWarning = localStorage.getItem(STORAGE_KEY);
    if (!hasSeenWarning) {
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-sm bg-vocl-surface rounded-xl border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-base font-semibold text-vocl-surface-dark">Stay Safe</h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-vocl-surface-dark/50 hover:text-vocl-surface-dark/30 hover:bg-white/10 transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3 text-sm">
          <p className="text-vocl-surface-dark/80">
            <strong className="text-vocl-surface-dark">Beware of scammers:</strong> The be.vocl team will never ask for your password or ask you to change your email.
          </p>

          <p className="text-vocl-surface-dark/80">
            If we need to contact you, we&apos;ll message you on be.vocl. All staff have a{" "}
            <IconShieldCheckFilled size={14} className="inline text-blue-500" />{" "}
            <span className="text-blue-400">badge</span> next to their name.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <button
            onClick={handleClose}
            className="w-full py-2 rounded-lg bg-vocl-accent text-white text-sm font-medium hover:bg-vocl-accent-hover transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
