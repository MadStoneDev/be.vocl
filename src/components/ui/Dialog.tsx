'use client';

import { useEffect, useRef, type ReactNode, type KeyboardEvent } from 'react';
import { IconX } from '@tabler/icons-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      dialogRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }

    // Trap focus within dialog
    if (e.key === 'Tab' && dialogRef.current) {
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'dialog-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`
          relative w-full ${sizeClasses[size]} mx-4
          bg-vocl-surface-dark border border-white/10 rounded-2xl
          shadow-2xl
          animate-in zoom-in-95 fade-in duration-200
          focus:outline-none
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 id="dialog-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-foreground transition-colors"
              aria-label="Close dialog"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={title ? '' : 'pt-6'}>{children}</div>

        {/* Close button if no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <IconX className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

interface DialogFooterProps {
  children: ReactNode;
}

export function DialogFooter({ children }: DialogFooterProps) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10">
      {children}
    </div>
  );
}
