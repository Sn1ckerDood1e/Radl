'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings2, Plus, Archive, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Season {
  id: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  startDate: Date | null;
  endDate: Date | null;
}

interface SeasonManagerProps {
  teamSlug: string;
  seasons: Season[];
}

function formatDate(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * SeasonManager component provides season management UI with create and archive.
 *
 * GAP-03: Coaches need persistent access to season management, not just when zero seasons exist.
 */
export function SeasonManager({ teamSlug, seasons }: SeasonManagerProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [archivingSeason, setArchivingSeason] = useState<Season | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeSeasons = seasons.filter(s => s.status === 'ACTIVE');
  const archivedSeasons = seasons.filter(s => s.status === 'ARCHIVED');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          status: 'ACTIVE',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create season');
      }

      toast.success('Season created', {
        description: `"${name}" is now active`,
      });

      // Reset form
      setName('');
      setStartDate('');
      setEndDate('');
      setIsCreateOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archivingSeason) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/seasons/${archivingSeason.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to archive season');
      }

      toast.success('Season archived', {
        description: `"${archivingSeason.name}" has been archived`,
      });

      setArchivingSeason(null);
      router.refresh();
    } catch (err) {
      toast.error('Failed to archive season', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="icon-sm"
            className="text-zinc-400 hover:text-zinc-200"
            title="Manage seasons"
          >
            <Settings2 className="h-4 w-4" />
            <span className="sr-only">Manage seasons</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-zinc-900 border-zinc-800">
          <DrawerHeader>
            <DrawerTitle className="text-white">Manage Seasons</DrawerTitle>
            <DrawerDescription className="text-zinc-400">
              Create new seasons or archive old ones
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-6 space-y-6">
            {/* Create button */}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Season
            </Button>

            {/* Inline create form */}
            {isCreateOpen && (
              <form onSubmit={handleCreate} className="space-y-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <h4 className="text-sm font-medium text-white">Create New Season</h4>

                {error && (
                  <div className="p-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="season-name" className="block text-sm font-medium text-zinc-300 mb-1">
                    Season Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="season-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Spring 2026"
                    required
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="start-date" className="block text-sm font-medium text-zinc-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label htmlFor="end-date" className="block text-sm font-medium text-zinc-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="end-date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm [color-scheme:dark]"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setError(null);
                      setName('');
                      setStartDate('');
                      setEndDate('');
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || !name.trim()}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            )}

            {/* Active seasons */}
            {activeSeasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Active Seasons</h4>
                <div className="space-y-2">
                  {activeSeasons.map(season => (
                    <div
                      key={season.id}
                      className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-md bg-emerald-500/10">
                          <Calendar className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{season.name}</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                              Active
                            </span>
                          </div>
                          {(season.startDate || season.endDate) && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {season.startDate ? formatDate(season.startDate) : 'No start'}
                              {' - '}
                              {season.endDate ? formatDate(season.endDate) : 'No end'}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setArchivingSeason(season)}
                        className="text-zinc-400 hover:text-amber-400"
                        title="Archive season"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Archived seasons */}
            {archivedSeasons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Archived Seasons</h4>
                <div className="space-y-2">
                  {archivedSeasons.map(season => (
                    <div
                      key={season.id}
                      className="flex items-center gap-3 p-3 bg-zinc-800/30 rounded-lg border border-zinc-800"
                    >
                      <div className="p-1.5 rounded-md bg-zinc-700/50">
                        <Calendar className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-400">{season.name}</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-700 text-zinc-400">
                            Archived
                          </span>
                        </div>
                        {(season.startDate || season.endDate) && (
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {season.startDate ? formatDate(season.startDate) : 'No start'}
                            {' - '}
                            {season.endDate ? formatDate(season.endDate) : 'No end'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {seasons.length === 0 && !isCreateOpen && (
              <div className="text-center py-8">
                <Calendar className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No seasons yet</p>
                <p className="text-xs text-zinc-500 mt-1">Create your first season to start adding practices</p>
              </div>
            )}
          </div>

          <div className="px-4 pb-4">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Done
              </Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Archive confirmation dialog */}
      <Dialog open={!!archivingSeason} onOpenChange={(open) => !open && setArchivingSeason(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Archive Season?</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Archive &ldquo;{archivingSeason?.name}&rdquo;? Practices will remain but the season won&apos;t appear in selectors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setArchivingSeason(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Archiving...' : 'Archive Season'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
