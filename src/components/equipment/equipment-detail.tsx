'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QRCodeDisplay } from './qr-code-display';
import { Button } from '@/components/ui/button';
import type { EquipmentReadinessResult } from '@/lib/equipment/readiness';

interface EquipmentDetailProps {
  equipment: {
    id: string;
    type: 'SHELL' | 'OAR' | 'LAUNCH' | 'OTHER';
    name: string;
    manufacturer: string | null;
    serialNumber: string | null;
    yearAcquired: number | null;
    purchasePrice: string | null; // Decimal comes as string from Prisma
    status: 'ACTIVE' | 'INACTIVE' | 'RETIRED';
    notes: string | null;
    boatClass: string | null;
    weightCategory: string | null;
    lastInspectedAt: string | null;
    readiness: EquipmentReadinessResult;
  };
  teamSlug: string;
  isCoach: boolean;
}

const boatClassLabels: Record<string, string> = {
  SINGLE_1X: 'Single (1x)',
  DOUBLE_2X: 'Double (2x)',
  PAIR_2_MINUS: 'Pair (2-)',
  COXED_PAIR_2_PLUS: 'Coxed Pair (2+)',
  FOUR_4_MINUS: 'Four (4-)',
  COXED_FOUR_4_PLUS: 'Coxed Four (4+)',
  QUAD_4X: 'Quad (4x)',
  EIGHT_8_PLUS: 'Eight (8+)',
  OTHER: 'Other',
};

const typeLabels: Record<string, string> = {
  SHELL: 'Shell',
  OAR: 'Oar',
  LAUNCH: 'Launch',
  OTHER: 'Other',
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-emerald-500/20 text-emerald-400' },
  INACTIVE: { label: 'Inactive', className: 'bg-yellow-500/20 text-yellow-400' },
  RETIRED: { label: 'Retired', className: 'bg-zinc-700 text-zinc-400' },
};

export function EquipmentDetail({ equipment, teamSlug, isCoach }: EquipmentDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(equipment.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isMarkingInspected, setIsMarkingInspected] = useState(false);

  const handleStatusToggle = async () => {
    const nextStatus = status === 'ACTIVE' ? 'INACTIVE' : status === 'INACTIVE' ? 'RETIRED' : 'ACTIVE';
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/equipment/${equipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (response.ok) {
        setStatus(nextStatus);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkInspected = async () => {
    setIsMarkingInspected(true);
    try {
      const response = await fetch(`/api/equipment/${equipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markInspected: true }),
      });

      if (response.ok) {
        // Refresh the page to show updated inspection date and readiness
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to mark as inspected:', error);
    } finally {
      setIsMarkingInspected(false);
    }
  };

  const currentStatus = statusConfig[status];

  // Format last inspection date
  const formatInspectionDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">{equipment.name}</h2>
          <p className="text-zinc-400 mt-1">{typeLabels[equipment.type]}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.className}`}>
            {currentStatus.label}
          </span>
          {isCoach && (
            <>
              <button
                onClick={handleStatusToggle}
                disabled={isUpdating}
                className="inline-flex items-center px-3 py-1.5 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 transition-colors"
              >
                {isUpdating ? 'Updating...' : 'Change Status'}
              </button>
              <Link
                href={`/${teamSlug}/equipment/${equipment.id}/edit`}
                className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                Edit
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Inspection Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Inspection Status</h3>
          <div className="flex items-center justify-between">
            <div>
              <dt className="text-sm font-medium text-zinc-400">Last Inspected</dt>
              <dd className="text-sm text-zinc-200 mt-1">{formatInspectionDate(equipment.lastInspectedAt)}</dd>
              {equipment.readiness.reasons.length > 0 && (
                <dd className="text-xs text-zinc-400 mt-1">
                  {equipment.readiness.reasons.join(', ')}
                </dd>
              )}
            </div>
            {isCoach && (
              <Button
                onClick={handleMarkInspected}
                disabled={isMarkingInspected}
                variant="outline"
              >
                {isMarkingInspected ? 'Updating...' : 'Mark as Inspected'}
              </Button>
            )}
          </div>
        </div>

        {/* Equipment Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white border-b border-zinc-800 pb-2">Details</h3>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {equipment.manufacturer && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Manufacturer</dt>
                <dd className="text-sm text-zinc-200">{equipment.manufacturer}</dd>
              </div>
            )}

            {equipment.serialNumber && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Serial Number</dt>
                <dd className="text-sm text-zinc-200 font-mono">{equipment.serialNumber}</dd>
              </div>
            )}

            {equipment.yearAcquired && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Year Acquired</dt>
                <dd className="text-sm text-zinc-200">{equipment.yearAcquired}</dd>
              </div>
            )}

            {equipment.purchasePrice && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Purchase Price</dt>
                <dd className="text-sm text-zinc-200">
                  ${parseFloat(equipment.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}

            {equipment.boatClass && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Boat Class</dt>
                <dd className="text-sm text-zinc-200">{boatClassLabels[equipment.boatClass] || equipment.boatClass}</dd>
              </div>
            )}

            {equipment.weightCategory && (
              <div>
                <dt className="text-sm font-medium text-zinc-400">Weight Category</dt>
                <dd className="text-sm text-zinc-200">
                  {equipment.weightCategory === 'LIGHTWEIGHT' ? 'Lightweight' :
                   equipment.weightCategory === 'MIDWEIGHT' ? 'Midweight' : 'Heavyweight'}
                </dd>
              </div>
            )}

            {equipment.notes && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-zinc-400">Notes / Rigging Info</dt>
                <dd className="text-sm text-zinc-200 whitespace-pre-wrap">{equipment.notes}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* QR Code for Damage Reporting - Coaches only */}
        {isCoach && (
          <div className="bg-surface-2 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">QR Code</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <QRCodeDisplay
                equipmentId={equipment.id}
                equipmentName={equipment.name}
                size={120}
                showDownload
              />
              <div className="text-sm text-zinc-400">
                <p className="mb-2">
                  Print this QR code and attach it to the equipment.
                </p>
                <p>
                  Anyone can scan it to report damage directly — no login required.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
