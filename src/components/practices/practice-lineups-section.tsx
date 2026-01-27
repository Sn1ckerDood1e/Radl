'use client';

import { useState, forwardRef } from 'react';
import { ChevronDown, ChevronRight, Ship } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface WaterBlock {
  id: string;
  title: string | null;
  lineups?: Lineup[];
}

interface PracticeLineupsSectionProps {
  practiceId: string;
  waterBlocks: WaterBlock[];
  athletes: Athlete[];
  boats: Boat[];
  onRefresh: () => void;
}

/**
 * Consolidated lineups section for the bottom of the practice page.
 * Shows all water blocks with their lineup builders in collapsible panels.
 */
export const PracticeLineupsSection = forwardRef<HTMLDivElement, PracticeLineupsSectionProps>(
  function PracticeLineupsSection(
    { practiceId, waterBlocks, athletes, boats, onRefresh },
    ref
  ) {
    // Track which block is expanded (one at a time)
    const [expandedBlockId, setExpandedBlockId] = useState<string | null>(
      waterBlocks.length === 1 ? waterBlocks[0].id : null
    );

    const handleSaveLineups = async (blockId: string, updatedLineups: Lineup[]) => {
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

    const toggleBlock = (blockId: string) => {
      setExpandedBlockId(prev => (prev === blockId ? null : blockId));
    };

    return (
      <div ref={ref} className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Ship className="h-5 w-5 text-blue-400" />
          <h2 className="text-lg font-medium text-zinc-200">Lineups</h2>
          <span className="text-sm text-zinc-500">
            ({waterBlocks.length} water {waterBlocks.length === 1 ? 'block' : 'blocks'})
          </span>
        </div>

        <div className="space-y-3">
          {waterBlocks.map((block, index) => {
            const isExpanded = expandedBlockId === block.id;
            const lineups = block.lineups || [];
            const boatCount = lineups.length;

            return (
              <div
                key={block.id}
                className={cn(
                  'border rounded-lg overflow-hidden transition-colors',
                  isExpanded ? 'border-blue-500/30 bg-zinc-800/50' : 'border-zinc-800'
                )}
              >
                {/* Block header - always visible */}
                <button
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-zinc-500" />
                    )}
                    <span className="text-sm font-medium text-zinc-300">
                      Block {index + 1}: {block.title || 'Water Block'}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-500">
                    {boatCount === 0
                      ? 'No boats'
                      : boatCount === 1
                        ? '1 boat'
                        : `${boatCount} boats`}
                  </span>
                </button>

                {/* Lineup builder - only when expanded */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-800">
                    <div className="pt-4">
                      <MultiBoatLineupBuilder
                        blockId={block.id}
                        athletes={athletes}
                        boats={boats}
                        initialLineups={lineups}
                        onSave={(updatedLineups) => handleSaveLineups(block.id, updatedLineups)}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
