'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ExportAuditButtonProps {
  filters: {
    action?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

/**
 * Export audit logs as CSV button.
 *
 * Triggers CSV download with current filter params applied.
 * The export action is itself logged to the audit log.
 */
export function ExportAuditButton({ filters }: ExportAuditButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    try {
      // Build URL with filter params
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);

      const response = await fetch(`/api/admin/audit-logs/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status}`);
      }

      // Get blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[ExportAuditButton] Export error:', error);
    } finally {
      // Small delay to prevent double-clicks
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={exporting}
      loading={exporting}
    >
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
