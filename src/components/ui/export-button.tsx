'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';

interface ExportButtonProps {
  onExport: () => void;
  label?: string;
}

export function ExportButton({ onExport, label = 'Export CSV' }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const handleClick = async () => {
    setExporting(true);
    try {
      onExport();
    } finally {
      // Small delay to show feedback
      setTimeout(() => setExporting(false), 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={exporting}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {exporting ? 'Exporting...' : label}
    </button>
  );
}
