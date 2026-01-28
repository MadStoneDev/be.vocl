'use client';

import { useEffect, useCallback } from 'react';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: ShortcutHandler;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const matchesKey = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const matchesCtrl = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;
        const matchesShift = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = shortcut.alt ? event.altKey : !event.altKey;
        const matchesMeta = shortcut.meta ? event.metaKey : !event.metaKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          event.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Pre-configured shortcuts for common actions
export function useGlobalShortcuts({
  onCreatePost,
  onSearch,
  onGoHome,
  onGoNotifications,
  onGoProfile,
}: {
  onCreatePost?: () => void;
  onSearch?: () => void;
  onGoHome?: () => void;
  onGoNotifications?: () => void;
  onGoProfile?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onCreatePost) {
    shortcuts.push({
      key: 'n',
      handler: onCreatePost,
      description: 'New post',
    });
  }

  if (onSearch) {
    shortcuts.push({
      key: '/',
      handler: onSearch,
      description: 'Search',
    });
  }

  if (onGoHome) {
    shortcuts.push({
      key: 'g',
      shift: true,
      handler: onGoHome,
      description: 'Go home',
    });
  }

  if (onGoNotifications) {
    shortcuts.push({
      key: 'g',
      alt: true,
      handler: onGoNotifications,
      description: 'Go to notifications',
    });
  }

  if (onGoProfile) {
    shortcuts.push({
      key: 'p',
      shift: true,
      handler: onGoProfile,
      description: 'Go to profile',
    });
  }

  useKeyboardShortcuts(shortcuts);
}
