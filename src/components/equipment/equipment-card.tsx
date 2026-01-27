'use client';

import Link from 'next/link';
import { SwipeableListItem } from '@/components/mobile/swipeable-list-item';
import { ReadinessBadge, type ReadinessStatus } from '@/components/equipment/readiness-badge';

interface EquipmentCardProps {
  id: string;
  name: string;
  manufacturer: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
  boatClass: string | null;
  readinessStatus: ReadinessStatus;
  teamSlug: string;
  isCoach: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const boatClassLabels: Record<string, string> = {
  SINGLE_1X: '1x',
  DOUBLE_2X: '2x',
  PAIR_2_MINUS: '2-',
  COXED_PAIR_2_PLUS: '2+',
  FOUR_4_MINUS: '4-',
  COXED_FOUR_4_PLUS: '4+',
  QUAD_4X: '4x',
  EIGHT_8_PLUS: '8+',
  OTHER: 'Other',
};

export function EquipmentCard({
  id,
  name,
  manufacturer,
  status,
  boatClass,
  readinessStatus,
  teamSlug,
  isCoach,
  onEdit,
  onDelete,
}: EquipmentCardProps) {
  return (
    <SwipeableListItem
      onSwipeLeft={onDelete}
      onSwipeRight={onEdit}
      disabled={!isCoach}
    >
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 p-4 hover:border-zinc-600 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/${teamSlug}/equipment/${id}`}
                className="font-medium text-white hover:text-emerald-400 truncate"
              >
                {name}
              </Link>
              <ReadinessBadge status={readinessStatus} />
            </div>
            {manufacturer && (
              <p className="text-sm text-zinc-400 truncate">{manufacturer}</p>
            )}
            {boatClass && (
              <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
                {boatClassLabels[boatClass] || boatClass}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : status === 'INACTIVE'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {status === 'ACTIVE' ? 'Active' : status === 'INACTIVE' ? 'Inactive' : 'Retired'}
            </span>
            {isCoach && (
              <Link
                href={`/${teamSlug}/equipment/${id}/edit`}
                className="text-sm text-zinc-400 hover:text-emerald-400"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
      </div>
    </SwipeableListItem>
  );
}
