'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';

interface UserSearchProps {
  initialSearch: string;
}

/**
 * User search component with debounced URL parameter updates.
 *
 * Features:
 * - Debounced search (300ms delay)
 * - Clear button when search has value
 * - Updates URL search params for server-side filtering
 * - Shows loading state during navigation
 */
export function UserSearch({ initialSearch }: UserSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialSearch);

  // Debounced search that updates URL
  const debouncedSearch = useDebouncedCallback((searchTerm: string) => {
    const params = new URLSearchParams(searchParams);

    // Reset to page 1 when searching
    params.set('page', '1');

    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }

    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  }, 300);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValue(newValue);
      debouncedSearch(newValue);
    },
    [debouncedSearch]
  );

  const handleClear = useCallback(() => {
    setValue('');
    const params = new URLSearchParams(searchParams);
    params.delete('search');
    params.set('page', '1');
    startTransition(() => {
      router.push(`/admin/users?${params.toString()}`);
    });
  }, [router, searchParams]);

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
          isPending ? 'text-teal-500 animate-pulse' : 'text-[var(--text-muted)]'
        }`}
      />
      <Input
        type="text"
        placeholder="Search by email, name, facility, or club..."
        value={value}
        onChange={handleChange}
        className="pl-9 pr-9"
        aria-label="Search users"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-2 top-1/2 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
