'use client';

import { MultiBoatLineupBuilder } from '@/components/lineups/multi-boat-lineup-builder';
import type { BoatClass } from '@/generated/prisma';

interface Athlete {
  id: string;
  displayName: string | null;
  sidePreference?: 'PORT' | 'STARBOARD' | 'BOTH' | null;
}

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

interface WaterBlockContentProps {
  /** Block ID */
  blockId: string;
  /** Practice ID for API calls */
  practiceId: string;
  /** All team athletes */
  athletes: Athlete[];
  /** Available boats */
  boats: Boat[];
  /** Existing lineups for this block */
  lineups: Lineup[];
  /** Refresh handler after save */
  onRefresh: () => void;
}

/**
 * Water block expanded content - multi-boat lineup builder.
 */
export function WaterBlockContent({
  blockId,
  practiceId,
  athletes,
  boats,
  lineups,
  onRefresh,
}: WaterBlockContentProps) {
  const handleSave = async (updatedLineups: Lineup[]) => {
    // Save lineups via bulk endpoint
    const response = await fetch(
      `/api/practices/${practiceId}/blocks/${blockId}/lineups`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineups: updatedLineups }),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save lineups');
    }

    onRefresh();
  };

  return (
    <MultiBoatLineupBuilder
      blockId={blockId}
      athletes={athletes}
      boats={boats}
      initialLineups={lineups}
      onSave={handleSave}
    />
  );
}
