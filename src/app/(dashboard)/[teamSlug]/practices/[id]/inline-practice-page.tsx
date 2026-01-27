'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InlineTextField } from '@/components/shared/inline-text-field';
import { InlineTextarea } from '@/components/shared/inline-textarea';
import { SortableBlockList } from '@/components/practices/sortable-block-list';
import { WaterBlockSummary } from '@/components/practices/water-block-summary';
import { PracticeLineupsSection } from '@/components/practices/practice-lineups-section';
import { ErgBlockContent } from '@/components/practices/erg-block-content';
import type { BlockType } from '@/generated/prisma';
import type { BoatClass, WorkoutType } from '@/generated/prisma';

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

interface Workout {
  id: string;
  type: WorkoutType;
  notes: string | null;
  visibleToAthletes: boolean;
  intervals: Array<{
    id: string;
    position: number;
    durationType: string;
    duration: number;
    targetSplit: string | null;
    targetStrokeRate: number | null;
    restDuration: number;
    restType: string;
  }>;
}

interface Block {
  id: string;
  type: BlockType;
  title: string | null;
  notes: string | null;
  durationMinutes: number | null;
  category: string | null;
  lineups?: Lineup[];
  workout?: Workout | null;
}

interface Practice {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  blocks: Block[];
  season: { id: string; name: string } | null;
}

interface InlinePracticePageProps {
  practice: Practice;
  teamSlug: string;
  isCoach: boolean;
  athletes: Athlete[];
  boats: Boat[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateForInput(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}

function formatTimeForInput(dateStr: string): string {
  return new Date(dateStr).toTimeString().slice(0, 5);
}

/**
 * Inline practice editing page.
 *
 * Features:
 * - Always editable header (name, date, times, notes)
 * - Sortable block list with expand/collapse
 * - Block content editors (lineup, workout)
 * - Publish/unpublish toggle
 * - Delete with confirmation
 */
export function InlinePracticePage({
  practice,
  teamSlug,
  isCoach,
  athletes,
  boats,
}: InlinePracticePageProps) {
  const router = useRouter();
  const lineupsSectionRef = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState(practice.blocks);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter water blocks for the lineups section
  const waterBlocks = useMemo(
    () => blocks.filter(b => b.type === 'WATER'),
    [blocks]
  );

  // Scroll to lineups section
  const scrollToLineups = useCallback(() => {
    lineupsSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Refresh page data
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Save practice field
  const savePracticeField = async (field: string, value: string | null) => {
    const response = await fetch(`/api/practices/${practice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save');
    }
  };

  // Save block field
  const saveBlockField = async (blockId: string, updates: Partial<Block>) => {
    const response = await fetch(
      `/api/practices/${practice.id}/blocks/${blockId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to save');
    }
  };

  // Delete block
  const handleDeleteBlock = async (blockId: string) => {
    const response = await fetch(
      `/api/practices/${practice.id}/blocks/${blockId}`,
      { method: 'DELETE' }
    );

    if (!response.ok) {
      toast.error('Failed to delete block');
      return;
    }

    setBlocks(prev => prev.filter(b => b.id !== blockId));
    toast.success('Block deleted');
  };

  // Add block
  const handleAddBlock = async (type: BlockType) => {
    const response = await fetch(`/api/practices/${practice.id}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });

    if (!response.ok) {
      toast.error('Failed to add block');
      return;
    }

    const data = await response.json();
    setBlocks(prev => [...prev, data.block]);
  };

  // Reorder blocks
  const handleReorderBlocks = async (blockIds: string[]) => {
    // Optimistic update
    setBlocks(prev => {
      const ordered: Block[] = [];
      for (const id of blockIds) {
        const block = prev.find(b => b.id === id);
        if (block) ordered.push(block);
      }
      return ordered;
    });

    const response = await fetch(
      `/api/practices/${practice.id}/blocks/reorder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positions: blockIds.map((id, index) => ({ blockId: id, position: index })),
        }),
      }
    );

    if (!response.ok) {
      toast.error('Failed to reorder blocks');
      refresh();
    }
  };

  // Toggle publish
  const handleTogglePublish = async () => {
    setIsPublishing(true);
    try {
      const newStatus = practice.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      await savePracticeField('status', newStatus);
      refresh();
      toast.success(newStatus === 'PUBLISHED' ? 'Practice published' : 'Practice unpublished');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete practice
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/practices/${practice.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      router.push(`/${teamSlug}/practices`);
      router.refresh();
    } catch {
      toast.error('Failed to delete practice');
      setIsDeleting(false);
    }
  };

  // Render block content based on type
  const renderBlockContent = (block: Block) => {
    if (block.type === 'WATER') {
      // Water blocks show workout builder + boat assignment summary
      return (
        <div className="space-y-4">
          {/* Workout/piece builder - same as ERG blocks */}
          <ErgBlockContent
            blockId={block.id}
            practiceId={practice.id}
            blockType="WATER"
            workout={block.workout || null}
            onRefresh={refresh}
          />

          {/* Boat assignments summary - full editing in Lineups section */}
          <div className="pt-4 border-t border-zinc-800">
            <WaterBlockSummary
              lineups={block.lineups || []}
              boats={boats}
              onScrollToLineups={scrollToLineups}
            />
          </div>
        </div>
      );
    }

    if (block.type === 'ERG') {
      return (
        <ErgBlockContent
          blockId={block.id}
          practiceId={practice.id}
          blockType="ERG"
          workout={block.workout || null}
          onRefresh={refresh}
        />
      );
    }

    // LAND and MEETING blocks: simple notes-only for now
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${teamSlug}/practices`}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Practices
        </Link>

        {isCoach && (
          <div className="flex items-center gap-2">
            {/* Publish toggle */}
            <button
              type="button"
              onClick={handleTogglePublish}
              disabled={isPublishing}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                practice.status === 'PUBLISHED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
              )}
            >
              {practice.status === 'PUBLISHED' ? (
                <>
                  <Eye className="h-4 w-4" />
                  Published
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4" />
                  Draft
                </>
              )}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400 mb-3">
            Delete this practice? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Practice header - always editable */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-4">
        {/* Name */}
        <div>
          {isCoach ? (
            <InlineTextField
              value={practice.name}
              onSave={(name) => savePracticeField('name', name)}
              placeholder="Practice name..."
              className="text-2xl font-bold"
              minLength={1}
              maxLength={100}
              aria-label="Practice name"
            />
          ) : (
            <h1 className="text-2xl font-bold text-white">{practice.name}</h1>
          )}
          {practice.season && (
            <p className="text-sm text-zinc-500 mt-1">{practice.season.name}</p>
          )}
        </div>

        {/* Date and times */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Date</label>
            {isCoach ? (
              <InlineTextField
                value={formatDateForInput(practice.date)}
                onSave={(date) => savePracticeField('date', new Date(date).toISOString())}
                type="date"
                aria-label="Practice date"
              />
            ) : (
              <p className="text-zinc-200">{formatDate(practice.date)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start Time</label>
            {isCoach ? (
              <InlineTextField
                value={formatTimeForInput(practice.startTime)}
                onSave={(time) => {
                  const date = new Date(practice.date);
                  const [h, m] = time.split(':');
                  date.setHours(parseInt(h), parseInt(m));
                  return savePracticeField('startTime', date.toISOString());
                }}
                type="time"
                aria-label="Start time"
              />
            ) : (
              <p className="text-zinc-200">{formatTimeForInput(practice.startTime)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">End Time</label>
            {isCoach ? (
              <InlineTextField
                value={formatTimeForInput(practice.endTime)}
                onSave={(time) => {
                  const date = new Date(practice.date);
                  const [h, m] = time.split(':');
                  date.setHours(parseInt(h), parseInt(m));
                  return savePracticeField('endTime', date.toISOString());
                }}
                type="time"
                aria-label="End time"
              />
            ) : (
              <p className="text-zinc-200">{formatTimeForInput(practice.endTime)}</p>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Notes</label>
          {isCoach ? (
            <InlineTextarea
              value={practice.notes || ''}
              onSave={(notes) => savePracticeField('notes', notes || null)}
              placeholder="Add practice notes..."
              rows={2}
              autoResize
              aria-label="Practice notes"
            />
          ) : practice.notes ? (
            <p className="text-zinc-300 whitespace-pre-wrap">{practice.notes}</p>
          ) : (
            <p className="text-zinc-500 italic">No notes</p>
          )}
        </div>
      </div>

      {/* Blocks */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
        <h2 className="text-lg font-medium text-zinc-200 mb-4">Practice Blocks</h2>
        <SortableBlockList
          blocks={blocks}
          onReorder={handleReorderBlocks}
          onSaveBlock={saveBlockField}
          onDeleteBlock={handleDeleteBlock}
          onAddBlock={handleAddBlock}
          isCoach={isCoach}
          renderBlockContent={renderBlockContent}
        />
      </div>

      {/* Lineups Section - only if water blocks exist */}
      {waterBlocks.length > 0 && (
        <PracticeLineupsSection
          ref={lineupsSectionRef}
          practiceId={practice.id}
          waterBlocks={waterBlocks}
          athletes={athletes}
          boats={boats}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
