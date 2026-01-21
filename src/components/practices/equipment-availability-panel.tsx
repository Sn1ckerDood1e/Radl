'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Ship } from 'lucide-react';

interface EquipmentItem {
  id: string;
  name: string;
  type: string;
  boatClass: string | null;
  isAvailable: boolean;
  unavailableReasons: string[];
}

interface EquipmentAvailabilityPanelProps {
  className?: string;
}

export function EquipmentAvailabilityPanel({ className }: EquipmentAvailabilityPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Lazy load: only fetch when panel is expanded for the first time
  useEffect(() => {
    if (isExpanded && !hasFetched) {
      fetchEquipment();
    }
  }, [isExpanded, hasFetched]);

  const fetchEquipment = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/equipment');
      if (!response.ok) throw new Error('Failed to load equipment');
      const data = await response.json();
      setEquipment(data.equipment);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  };

  // Count available vs unavailable
  const availableCount = equipment.filter(e => e.isAvailable).length;
  const unavailableCount = equipment.filter(e => !e.isAvailable).length;

  // Group by type (SHELL, OAR, LAUNCH, OTHER)
  const groupedEquipment = equipment.reduce((acc, item) => {
    const group = acc[item.type] || [];
    group.push(item);
    acc[item.type] = group;
    return acc;
  }, {} as Record<string, EquipmentItem[]>);

  const typeOrder = ['SHELL', 'OAR', 'LAUNCH', 'OTHER'];
  const typeLabels: Record<string, string> = {
    SHELL: 'Boats',
    OAR: 'Oars',
    LAUNCH: 'Launches',
    OTHER: 'Other Equipment',
  };

  return (
    <div className={`border border-zinc-700 rounded-lg bg-zinc-800/50 ${className || ''}`}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-800 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Ship className="h-4 w-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Equipment Availability</span>
          {hasFetched && (
            <span className="text-xs text-zinc-500">
              ({availableCount} available{unavailableCount > 0 ? `, ${unavailableCount} unavailable` : ''})
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-700">
          {isLoading && (
            <p className="text-sm text-zinc-500 py-4 text-center">Loading equipment...</p>
          )}

          {error && (
            <p className="text-sm text-red-400 py-4 text-center">{error}</p>
          )}

          {!isLoading && !error && equipment.length === 0 && (
            <p className="text-sm text-zinc-500 py-4 text-center">No equipment found</p>
          )}

          {!isLoading && !error && equipment.length > 0 && (
            <div className="space-y-4 pt-3">
              {/* Unavailable equipment alert */}
              {unavailableCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-300">
                    {unavailableCount} piece{unavailableCount > 1 ? 's' : ''} of equipment {unavailableCount > 1 ? 'are' : 'is'} currently unavailable due to damage or maintenance.
                  </p>
                </div>
              )}

              {/* Equipment list grouped by type */}
              {typeOrder
                .filter(type => groupedEquipment[type]?.length > 0)
                .map(type => (
                  <div key={type}>
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
                      {typeLabels[type]}
                    </h4>
                    <div className="space-y-1">
                      {groupedEquipment[type].map(item => (
                        <EquipmentRow key={item.id} item={item} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* Info note */}
          <p className="text-xs text-zinc-600 mt-4 pt-3 border-t border-zinc-700">
            Equipment assignment happens in lineups (Phase 3). This panel shows current availability for planning.
          </p>
        </div>
      )}
    </div>
  );
}

function EquipmentRow({ item }: { item: EquipmentItem }) {
  const [showReasons, setShowReasons] = useState(false);

  if (item.isAvailable) {
    return (
      <div className="flex items-center gap-2 py-1.5 px-2 rounded bg-zinc-800/50">
        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
        <span className="text-sm text-zinc-300">{item.name}</span>
        {item.boatClass && (
          <span className="text-xs text-zinc-500">({item.boatClass})</span>
        )}
      </div>
    );
  }

  return (
    <div className="py-1.5 px-2 rounded bg-red-500/5 border border-red-500/10">
      <button
        type="button"
        onClick={() => setShowReasons(!showReasons)}
        className="w-full flex items-center gap-2 text-left"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
        <span className="text-sm text-zinc-400 line-through">{item.name}</span>
        {item.boatClass && (
          <span className="text-xs text-zinc-600 line-through">({item.boatClass})</span>
        )}
        <span className="text-xs text-red-400 ml-auto">Unavailable</span>
      </button>
      {showReasons && item.unavailableReasons.length > 0 && (
        <ul className="mt-2 ml-5 space-y-1">
          {item.unavailableReasons.map((reason, idx) => (
            <li key={idx} className="text-xs text-red-300/70">
              - {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
