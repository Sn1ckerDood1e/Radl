'use client';

import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  meta?: boolean;  // Cmd on Mac, Ctrl on Windows
  shift?: boolean;
  handler: () => void;
  description: string;
}

const shortcuts: Shortcut[] = [];

export function useKeyboardShortcuts(newShortcuts: Shortcut[]) {
  useEffect(() => {
    // Register shortcuts
    shortcuts.push(...newShortcuts);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        // Exception: Escape should always work
        if (e.key !== 'Escape') return;
      }

      for (const shortcut of shortcuts) {
        const metaMatch = shortcut.meta
          ? (e.metaKey || e.ctrlKey)
          : (!e.metaKey && !e.ctrlKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (metaMatch && shiftMatch && keyMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Remove registered shortcuts
      newShortcuts.forEach(s => {
        const idx = shortcuts.indexOf(s);
        if (idx > -1) shortcuts.splice(idx, 1);
      });
    };
  }, [newShortcuts]);
}

export function getRegisteredShortcuts(): Shortcut[] {
  return [...shortcuts];
}
