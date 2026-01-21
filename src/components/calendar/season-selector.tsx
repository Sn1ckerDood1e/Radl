'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface SeasonSelectorProps {
  seasons: { id: string; name: string }[];
  currentSeasonId?: string;
}

/**
 * Client component for season switching.
 * Changes URL query param on selection.
 */
export function SeasonSelector({ seasons, currentSeasonId }: SeasonSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSeasonId = e.target.value;
      const params = new URLSearchParams(searchParams.toString());

      if (newSeasonId) {
        params.set('seasonId', newSeasonId);
      } else {
        params.delete('seasonId');
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  if (seasons.length <= 1) {
    return null;
  }

  return (
    <div className="mb-4">
      <label htmlFor="season-select" className="sr-only">
        Select season
      </label>
      <select
        id="season-select"
        value={currentSeasonId || ''}
        onChange={handleChange}
        className="w-full sm:w-auto px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
      >
        <option value="">All seasons</option>
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
    </div>
  );
}
