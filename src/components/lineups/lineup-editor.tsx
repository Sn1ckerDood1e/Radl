'use client';

import { LandLineupBuilder } from './land-lineup-builder';
import { WaterLineupBuilder } from './water-lineup-builder';
import { BoatClass } from '@/generated/prisma';
import { getSeatsForBoatClass } from '@/lib/lineup/position-labels';

// Define types for different block scenarios
type BlockType = 'WATER' | 'LAND' | 'ERG';

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

// Props for WATER blocks
interface WaterLineupProps {
  blockType: 'WATER';
  blockId: string;
  athletes: Athlete[];
  boats: Boat[];
  boatClass: BoatClass; // Required for water blocks
  initialLineup?: {
    id?: string;
    boatId: string | null;
    seats: Array<{
      position: number;
      athleteId: string;
      side: 'PORT' | 'STARBOARD' | 'NONE';
    }>;
  };
  onSaveLineup: (lineup: {
    boatId: string | null;
    seats: Array<{
      position: number;
      athleteId: string | null;
      label: string;
      side: 'PORT' | 'STARBOARD' | 'NONE';
    }>;
  }) => Promise<void>;
  existingLineups?: Array<{ boatId: string; practiceId: string; practiceName: string }>;
}

// Props for LAND/ERG blocks
interface LandLineupProps {
  blockType: 'LAND' | 'ERG';
  athletes: Athlete[];
  ergCount?: number; // Available ergs for ERG blocks
  initialAssignedIds?: string[]; // Pre-assigned athlete IDs
  onSaveAssignments: (athleteIds: string[]) => Promise<void>;
}

// Union type for all props
type LineupEditorProps = (WaterLineupProps | LandLineupProps) & {
  isSaving?: boolean;
};

export function LineupEditor(props: LineupEditorProps) {
  const { blockType, athletes, isSaving = false } = props;

  // Route to LAND/ERG builder
  if (blockType === 'LAND' || blockType === 'ERG') {
    return (
      <LandLineupBuilder
        athletes={athletes}
        initialAssignedIds={props.initialAssignedIds}
        ergCount={props.ergCount}
        blockType={blockType}
        onSave={props.onSaveAssignments}
        isSaving={isSaving}
      />
    );
  }

  // Route to WATER builder
  if (blockType === 'WATER') {
    // Convert lineup data to seats format if exists
    const initialSeats = props.initialLineup?.seats.map(s => {
      // Get seat configuration from boat class to get label
      const seatConfig = getSeatsForBoatClass(props.boatClass).find(sc => sc.position === s.position);

      return {
        position: s.position,
        label: seatConfig?.label || s.position.toString(),
        side: s.side,
        athleteId: s.athleteId,
      };
    });

    return (
      <WaterLineupBuilder
        blockId={props.blockId}
        boatClass={props.boatClass}
        athletes={athletes}
        boats={props.boats}
        initialSeats={initialSeats}
        initialBoatId={props.initialLineup?.boatId || null}
        onSave={props.onSaveLineup}
        existingLineups={props.existingLineups}
      />
    );
  }

  // Should never reach here
  return null;
}
