'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Users,
  Calendar,
  Ship,
  Settings,
  FileText,
  Trophy,
  Plus,
  HelpCircle,
} from 'lucide-react';

interface CommandPaletteProps {
  teamSlug?: string;
  onOpenShortcuts: () => void;
}

export function CommandPalette({ teamSlug, onOpenShortcuts }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      // ? key for shortcuts (not in input)
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        ) return;
        e.preventDefault();
        onOpenShortcuts();
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenShortcuts]);

  const navigate = useCallback((path: string) => {
    router.push(path);
    setOpen(false);
    setSearch('');
  }, [router]);

  // Navigation items
  const navItems = teamSlug ? [
    { icon: Users, label: 'Roster', path: `/${teamSlug}/roster`, shortcut: 'R' },
    { icon: Calendar, label: 'Practices', path: `/${teamSlug}/practices`, shortcut: 'P' },
    { icon: Ship, label: 'Equipment', path: `/${teamSlug}/equipment`, shortcut: 'E' },
    { icon: Calendar, label: 'Schedule', path: `/${teamSlug}/schedule`, shortcut: 'S' },
    { icon: Trophy, label: 'Regattas', path: `/${teamSlug}/regattas` },
    { icon: FileText, label: 'Practice Templates', path: `/${teamSlug}/practice-templates` },
    { icon: Users, label: 'Lineup Templates', path: `/${teamSlug}/lineup-templates` },
    { icon: Settings, label: 'Settings', path: `/${teamSlug}/settings` },
  ] : [];

  // Action items
  const actionItems = teamSlug ? [
    { icon: Plus, label: 'New Practice', path: `/${teamSlug}/practices/new` },
    { icon: Plus, label: 'Add Equipment', path: `/${teamSlug}/equipment/new` },
    { icon: Plus, label: 'New Template', path: `/${teamSlug}/practice-templates/new` },
  ] : [];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => navigate(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              {item.shortcut && (
                <CommandShortcut>G+{item.shortcut}</CommandShortcut>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => navigate(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Help */}
        <CommandGroup heading="Help">
          <CommandItem onSelect={onOpenShortcuts} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <CommandShortcut>?</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
