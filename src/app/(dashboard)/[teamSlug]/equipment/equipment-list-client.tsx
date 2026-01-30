'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { EquipmentCard } from '@/components/equipment/equipment-card';
import { ExportButton } from '@/components/ui/export-button';
import { toCSV, downloadCSV } from '@/lib/export/csv';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Ship } from 'lucide-react';
import type { EquipmentReadinessResult } from '@/lib/equipment/readiness';

interface Equipment {
  id: string;
  type: 'SHELL' | 'OAR' | 'LAUNCH' | 'OTHER';
  name: string;
  manufacturer: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  boatClass: string | null;
  weightCategory: string | null;
  serialNumber: string | null;
  yearAcquired: number | null;
  notes: string | null;
  readiness: EquipmentReadinessResult;
}

interface EquipmentListClientProps {
  equipment: Equipment[];
  teamSlug: string;
  isCoach: boolean;
}

type FilterType = 'ALL' | 'SHELL' | 'OAR' | 'LAUNCH' | 'OTHER';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const typeLabels: Record<string, string> = {
  SHELL: 'Shells',
  OAR: 'Oars',
  LAUNCH: 'Launches',
  OTHER: 'Other',
};

export function EquipmentListClient({
  equipment,
  teamSlug,
  isCoach,
}: EquipmentListClientProps) {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Apply filters
  const filteredEquipment = equipment.filter(e => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    return true;
  });

  // Group by type
  const groupedEquipment = filteredEquipment.reduce<Record<string, Equipment[]>>(
    (groups, item) => {
      const type = item.type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(item);
      return groups;
    },
    {}
  );

  const toggleSection = (type: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(type)) {
      newCollapsed.delete(type);
    } else {
      newCollapsed.add(type);
    }
    setCollapsedSections(newCollapsed);
  };

  const typeOrder = ['SHELL', 'OAR', 'LAUNCH', 'OTHER'];

  const handleExport = () => {
    const csv = toCSV(equipment, [
      { key: 'name', header: 'Name' },
      { key: 'type', header: 'Type' },
      { key: 'manufacturer', header: 'Manufacturer' },
      { key: 'boatClass', header: 'Boat Class' },
      { key: 'weightCategory', header: 'Weight Category' },
      { key: 'status', header: 'Status' },
      { key: 'serialNumber', header: 'Serial Number' },
      { key: 'yearAcquired', header: 'Year Acquired' },
      { key: 'notes', header: 'Notes' },
    ]);
    const date = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `equipment-${date}.csv`);
  };

  // Handle equipment deletion
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/equipment/${deleteTarget.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the page to show updated list
        router.refresh();
      } else {
        console.error('Failed to delete equipment');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (equipment.length === 0) {
    return (
      <EmptyState
        icon={Ship}
        title="No equipment yet"
        description="Add your first shell, oars, or launch to get started."
        action={isCoach ? { label: "Add Equipment", href: `/${teamSlug}/equipment/new` } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {(['ALL', 'SHELL', 'OAR', 'LAUNCH', 'OTHER'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                typeFilter === type
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'All' : typeLabels[type]}
            </button>
          ))}
        </div>

        {/* Status Filter Toggle */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {/* Count and Export */}
        <div className="flex items-center gap-4 ml-auto">
          <span className="text-sm text-zinc-400">
            {filteredEquipment.length} item{filteredEquipment.length !== 1 ? 's' : ''}
          </span>
          <ExportButton onExport={handleExport} label="Export" />
        </div>
      </div>

      {/* Grouped Equipment Sections */}
      {filteredEquipment.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          No equipment matches your filters.
        </div>
      ) : (
        <div className="space-y-4">
          {typeOrder.map((type) => {
            const items = groupedEquipment[type];
            if (!items || items.length === 0) return null;

            const isCollapsed = collapsedSections.has(type);

            return (
              <div
                key={type}
                className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(type)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="font-medium text-white">
                    {typeLabels[type]} ({items.length})
                  </span>
                  <svg
                    className={`h-5 w-5 text-zinc-400 transition-transform ${
                      isCollapsed ? '' : 'rotate-180'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {!isCollapsed && (
                  <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <EquipmentCard
                        key={item.id}
                        id={item.id}
                        name={item.name}
                        manufacturer={item.manufacturer}
                        status={item.status}
                        boatClass={item.boatClass}
                        readinessStatus={item.readiness.status}
                        teamSlug={teamSlug}
                        isCoach={isCoach}
                        onEdit={() => router.push(`/${teamSlug}/equipment/${item.id}/edit`)}
                        onDelete={() => setDeleteTarget(item)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Equipment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
