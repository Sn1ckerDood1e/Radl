'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';

interface SeatAssignment {
  id: string;
  athleteId: string;
  position: number;
  side: string;
}

interface SaveAsTemplateButtonProps {
  boatClass: string;
  seats: SeatAssignment[];
  defaultBoatId?: string | null;
  onSaved?: (templateId: string) => void;
}

export function SaveAsTemplateButton({
  boatClass,
  seats,
  defaultBoatId,
  onSaved,
}: SaveAsTemplateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [includeBoat, setIncludeBoat] = useState(!!defaultBoatId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Template name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/lineup-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          boatClass,
          defaultBoatId: includeBoat ? defaultBoatId : undefined,
          seats: seats.map(seat => ({
            athleteId: seat.athleteId,
            position: seat.position,
            side: seat.side,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save template');
      }

      // Notify parent and close modal
      if (onSaved) {
        onSaved(result.template.id);
      }

      setIsOpen(false);
      setName('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setName('');
    setError(null);
  };

  const inputClassName = "block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm [color-scheme:dark]";

  return (
    <>
      {/* Button to open modal */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 transition-colors"
      >
        <Save className="h-4 w-4" />
        Save as Template
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Save as Template</h2>
              <button
                type="button"
                onClick={handleCancel}
                className="text-zinc-400 hover:text-zinc-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
                {error}
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label htmlFor="template-name" className="block text-sm font-medium text-zinc-300 mb-2">
                  Template Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Varsity 1V Standard"
                  className={inputClassName}
                  autoFocus
                />
              </div>

              {/* Summary */}
              <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-400 space-y-1">
                <div><span className="text-zinc-500">Boat Class:</span> {boatClass}</div>
                <div><span className="text-zinc-500">Seats:</span> {seats.length} athletes</div>
                {defaultBoatId && (
                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-700">
                    <input
                      type="checkbox"
                      id="include-boat"
                      checked={includeBoat}
                      onChange={(e) => setIncludeBoat(e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                    />
                    <label htmlFor="include-boat" className="text-zinc-300">
                      Include default boat assignment
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
