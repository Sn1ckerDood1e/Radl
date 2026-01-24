'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CommandPalette } from './command-palette';
import { ShortcutsOverlay } from './shortcuts-overlay';

export function CommandPaletteProvider() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const params = useParams();
  const router = useRouter();
  const teamSlug = params?.teamSlug as string | undefined;

  // G+key navigation shortcuts
  useEffect(() => {
    let gPressed = false;
    let gTimeout: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return;

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        gPressed = true;
        gTimeout = setTimeout(() => { gPressed = false; }, 1000);
        return;
      }

      if (gPressed && teamSlug) {
        gPressed = false;
        clearTimeout(gTimeout);
        switch (e.key.toLowerCase()) {
          case 'r': router.push(`/${teamSlug}/roster`); break;
          case 'p': router.push(`/${teamSlug}/practices`); break;
          case 'e': router.push(`/${teamSlug}/equipment`); break;
          case 's': router.push(`/${teamSlug}/schedule`); break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [teamSlug, router]);

  return (
    <>
      <CommandPalette
        teamSlug={teamSlug}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsOverlay
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </>
  );
}
