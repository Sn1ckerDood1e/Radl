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

interface User {
  id: string;
  email: string;
  displayName?: string | null;
}

interface UserSearchComboboxProps {
  /**
   * Currently selected user.
   */
  value: User | null;
  /**
   * Callback when user is selected.
   */
  onSelect: (user: User | null) => void;
  /**
   * Placeholder text when no user selected.
   */
  placeholder?: string;
  /**
   * Whether the combobox is disabled.
   */
  disabled?: boolean;
}

/**
 * Searchable dropdown for selecting users.
 *
 * Debounces search input and fetches matching users from the admin API.
 * Displays user email and display name in results.
 *
 * @example
 * ```tsx
 * <UserSearchCombobox
 *   value={selectedUser}
 *   onSelect={setSelectedUser}
 *   placeholder="Search users..."
 * />
 * ```
 */
export function UserSearchCombobox({
  value,
  onSelect,
  placeholder = 'Search users...',
  disabled = false,
}: UserSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchUsers = useDebouncedCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(searchTerm)}&limit=10`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(
          data.users.map((u: { id: string; email?: string; displayName?: string }) => ({
            id: u.id,
            email: u.email || '',
            displayName: u.displayName,
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
          {value ? value.displayName || value.email : placeholder}
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
              searchUsers(v);
            }}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            <CommandEmpty>
              {query.length < 2 ? 'Type at least 2 characters' : 'No users found'}
            </CommandEmpty>
            <CommandGroup>
              {results.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onSelect(user);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value?.id === user.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div>
                    <p className="font-medium">{user.displayName || user.email}</p>
                    {user.displayName && (
                      <p className="text-sm text-muted-foreground">{user.email}</p>
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
