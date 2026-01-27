'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BoatClass } from '@/generated/prisma';

interface Boat {
  id: string;
  name: string;
  boatClass: BoatClass | null;
  available: boolean;
}

interface Lineup {
  id: string;
  boatId: string | null;
  seats: Array<{
    position: number;
    label: string;
    side: 'PORT' | 'STARBOARD' | 'NONE';
    athleteId: string | null;
  }>;
}

interface WaterBlockSummaryProps {
  lineups: Lineup[];
  boats: Boat[];
  onScrollToLineups?: () => void;
}

/**
 * Simple summary for water blocks showing boat count and names.
 * Replaces the full lineup builder inside blocks.
 */
export function WaterBlockSummary({
  lineups,
  boats,
  onScrollToLineups,
}: WaterBlockSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const boatCount = lineups.length;
  const assignedBoats = lineups
    .map(l => boats.find(b => b.id === l.boatId))
    .filter(Boolean) as Boat[];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <Ship className="h-4 w-4" />
          <span>
            {boatCount === 0
              ? 'No boats assigned'
              : boatCount === 1
                ? '1 boat assigned'
                : `${boatCount} boats assigned`}
          </span>
        </button>

        {onScrollToLineups && (
          <button
            type="button"
            onClick={onScrollToLineups}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Edit in Lineups section
          </button>
        )}
      </div>

      {isExpanded && assignedBoats.length > 0 && (
        <ul className="ml-6 space-y-1">
          {assignedBoats.map(boat => {
            const lineup = lineups.find(l => l.boatId === boat.id);
            const athleteCount = lineup?.seats.filter(s => s.athleteId).length || 0;
            const totalSeats = lineup?.seats.length || 0;

            return (
              <li key={boat.id} className="text-sm text-zinc-500">
                <span className="text-zinc-300">{boat.name}</span>
                {boat.boatClass && (
                  <span className="text-zinc-600 ml-1">({boat.boatClass})</span>
                )}
                <span className="text-zinc-600 ml-2">
                  {athleteCount}/{totalSeats} seats filled
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
