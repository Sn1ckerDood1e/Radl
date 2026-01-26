'use client';

import { useState } from 'react';
import { showErrorToast, showSuccessToast } from '@/lib/toast-helpers';

interface QRBulkExportButtonProps {
  teamId: string;
  equipmentCount: number;
}

export function QRBulkExportButton({ teamId, equipmentCount }: QRBulkExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (equipmentCount === 0) {
      showErrorToast({ message: 'No equipment to export' });
      return;
    }

    setIsExporting(true);

    try {
      const response = await fetch(`/api/qr-export?teamId=${teamId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Get the PDF blob
      const blob = await response.blob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = response.headers.get('Content-Disposition');
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      link.download = filenameMatch?.[1] || 'qr-codes.pdf';

      link.click();
      URL.revokeObjectURL(url);

      showSuccessToast(`Exported ${equipmentCount} QR codes`);
    } catch (error) {
      showErrorToast({
        message: 'Failed to export QR codes',
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting || equipmentCount === 0}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? (
        <>
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Generating PDF...
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Export All QR Codes
        </>
      )}
    </button>
  );
}
