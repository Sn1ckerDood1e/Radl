'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Practice {
  id: string;
  name: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  status: 'DRAFT' | 'PUBLISHED';
  season: { name: string } | null;
  blocks: Array<{ id: string; type: string }>;
}

interface PracticeListClientProps {
  practices: Practice[];
  teamSlug: string;
  isCoach: boolean;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Client component for practice list with multi-select delete capability.
 *
 * CONTEXT.md: "Bulk delete - Checkbox selection on practice list"
 */
export function PracticeListClient({
  practices,
  teamSlug,
  isCoach,
}: PracticeListClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === practices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(practices.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`Delete ${selectedIds.size} practice(s)? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch('/api/practices/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ practiceIds: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete');
      }

      toast.success(`Deleted ${data.deleted} practice(s)`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete practices', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Selection controls (coaches only) */}
      {isCoach && practices.length > 0 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {selectionMode ? 'Cancel selection' : 'Select multiple'}
          </button>

          {selectionMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {selectedIds.size === practices.length ? 'Deselect all' : 'Select all'}
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete {selectedIds.size}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Practice list */}
      <div className="space-y-3">
        {practices.map(practice => (
          <div key={practice.id} className="flex items-start gap-3">
            {selectionMode && (
              <button
                type="button"
                onClick={() => toggleSelection(practice.id)}
                className="mt-4 p-1 shrink-0"
              >
                {selectedIds.has(practice.id) ? (
                  <CheckSquare className="h-5 w-5 text-teal-400" />
                ) : (
                  <Square className="h-5 w-5 text-zinc-500 hover:text-zinc-300" />
                )}
              </button>
            )}

            <Link
              href={selectionMode ? '#' : `/${teamSlug}/practices/${practice.id}`}
              onClick={(e) => {
                if (selectionMode) {
                  e.preventDefault();
                  toggleSelection(practice.id);
                }
              }}
              className={cn(
                'flex-1 block p-4 bg-zinc-900 border border-zinc-800 rounded-lg transition-colors overflow-hidden',
                selectionMode
                  ? selectedIds.has(practice.id)
                    ? 'border-teal-500/50 bg-teal-500/5'
                    : 'hover:border-zinc-700 cursor-pointer'
                  : 'hover:border-zinc-700'
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <h3 className="text-lg font-medium text-white truncate max-w-[200px] sm:max-w-none">{practice.name}</h3>
                    {practice.status === 'DRAFT' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-700 text-zinc-300 shrink-0">
                        Draft
                      </span>
                    )}
                    {practice.status === 'PUBLISHED' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400 shrink-0">
                        Published
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-400 mt-1">
                    {formatDate(practice.date)} &middot; {formatTime(practice.startTime)} - {formatTime(practice.endTime)}
                  </p>
                  {practice.season && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">{practice.season.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {practice.blocks.map((block) => (
                    <span
                      key={block.id}
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        block.type === 'WATER' && 'bg-blue-500/20 text-blue-400',
                        block.type === 'LAND' && 'bg-green-500/20 text-green-400',
                        block.type === 'ERG' && 'bg-orange-500/20 text-orange-400',
                        block.type === 'MEETING' && 'bg-purple-500/20 text-purple-400'
                      )}
                    >
                      {block.type}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
