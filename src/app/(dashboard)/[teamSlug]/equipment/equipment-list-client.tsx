'use client';

import { useState } from 'react';
import { EquipmentCard } from '@/components/equipment/equipment-card';
import { ExportButton } from '@/components/ui/export-button';
import { toCSV, downloadCSV } from '@/lib/export/csv';

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
  const [typeFilter, setTypeFilter] = useState<FilterType>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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

  if (equipment.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-zinc-500">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-white">No equipment yet</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Add your first piece of equipment to start tracking your team&apos;s assets.
        </p>
      </div>
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
            className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-zinc-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                        teamSlug={teamSlug}
                        isCoach={isCoach}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
