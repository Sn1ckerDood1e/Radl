'use client';

import { LandLineupBuilder } from './land-lineup-builder';
import { BoatClass } from '@/generated/prisma';

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
  athletes: Athlete[];
  boats: Boat[];
  boatClass?: BoatClass;
  initialLineup?: {
    id?: string;
    boatId: string | null;
    seats: Array<{
      position: number;
      athleteId: string;
    }>;
  };
  onSaveLineup: (lineup: {
    boatId: string | null;
    seats: Array<{ position: number; athleteId: string }>;
  }) => Promise<void>;
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

  // Route to WATER builder (not implemented yet - placeholder)
  if (blockType === 'WATER') {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-zinc-800 rounded-lg bg-zinc-900/50">
        <p className="text-zinc-400 text-sm">
          Water lineup builder coming soon (Plan 03-05)
        </p>
        <p className="text-zinc-600 text-xs mt-2">
          Will include drag-and-drop seat assignment
        </p>
      </div>
    );
  }

  // Should never reach here
  return null;
}
