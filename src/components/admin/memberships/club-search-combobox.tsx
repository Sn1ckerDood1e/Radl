'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

interface Club {
  id: string;
  name: string;
  facilityName: string | null;
}

interface ClubSearchComboboxProps {
  /**
   * Currently selected club.
   */
  value: Club | null;
  /**
   * Callback when club is selected.
   */
  onSelect: (club: Club | null) => void;
  /**
   * Placeholder text when no club selected.
   */
  placeholder?: string;
  /**
   * Whether the combobox is disabled.
   */
  disabled?: boolean;
}

/**
 * Searchable dropdown for selecting clubs.
 *
 * Debounces search input and fetches matching clubs from the admin API.
 * Displays club name and facility name in results.
 *
 * @example
 * ```tsx
 * <ClubSearchCombobox
 *   value={selectedClub}
 *   onSelect={setSelectedClub}
 *   placeholder="Search clubs..."
 * />
 * ```
 */
export function ClubSearchCombobox({
  value,
  onSelect,
  placeholder = 'Search clubs...',
  disabled = false,
}: ClubSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Club[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchClubs = useDebouncedCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/clubs?search=${encodeURIComponent(searchTerm)}&perPage=10`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(
          data.clubs.map((c: { id: string; name: string; facility?: { name: string } | null }) => ({
            id: c.id,
            name: c.name,
            facilityName: c.facility?.name || null,
          }))
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, 300);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {value ? value.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search..."
            value={query}
            onValueChange={(v) => {
              setQuery(v);
              searchClubs(v);
            }}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            <CommandEmpty>
              {query.length < 2 ? 'Type at least 2 characters' : 'No clubs found'}
            </CommandEmpty>
            <CommandGroup>
              {results.map((club) => (
                <CommandItem
                  key={club.id}
                  value={club.id}
                  onSelect={() => {
                    onSelect(club);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.id === club.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div>
                    <p className="font-medium">{club.name}</p>
                    {club.facilityName && (
                      <p className="text-sm text-muted-foreground">{club.facilityName}</p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
