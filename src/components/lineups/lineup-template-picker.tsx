'use client';

import { useState } from 'react';
import { Users, AlertTriangle } from 'lucide-react';

interface TemplateSeat {
  id: string;
  athleteId: string | null;
  position: number;
  side: string;
  athlete: {
    id: string;
    displayName: string | null;
  } | null;
}

interface LineupTemplate {
  id: string;
  name: string;
  boatClass: string;
  seats: TemplateSeat[];
  defaultBoat: {
    id: string;
    name: string;
  } | null;
}

interface Warning {
  type: 'missing_athlete' | 'unavailable_boat' | 'boat_class_mismatch';
  message: string;
  position?: number;
}

interface LineupTemplatePickerProps {
  blockId: string;
  boatClass?: string;
  onApplied?: () => void;
}

export function LineupTemplatePicker({ blockId, boatClass, onApplied }: LineupTemplatePickerProps) {
  const [templates, setTemplates] = useState<LineupTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [hasFetched, setHasFetched] = useState(false);

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const handleOpen = async () => {
    if (hasFetched) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = boatClass
        ? `/api/lineup-templates?boatClass=${boatClass}`
        : '/api/lineup-templates';

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch templates');
      }

      setTemplates(result.templates || []);
      setHasFetched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedId) {
      setError('Please select a template');
      return;
    }

    setIsApplying(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await fetch(`/api/lineup-templates/${selectedId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply template');
      }

      // Show warnings if any
      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      // Notify parent component
      if (onApplied) {
        onApplied();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Open button */}
      {!hasFetched && (
        <button
          type="button"
          onClick={handleOpen}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Loading Templates...' : 'Load from Template'}
        </button>
      )}

      {/* Error display */}
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}

      {/* Warnings display */}
      {warnings.length > 0 && (
        <div className="p-3 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Template Applied with Warnings
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-300">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Template selection */}
      {hasFetched && templates.length === 0 && (
        <div className="p-4 text-sm text-zinc-400 bg-zinc-800/50 border border-zinc-700 rounded-lg text-center">
          No templates found{boatClass ? ` for ${boatClass}` : ''}. Create a template first to reuse lineups.
        </div>
      )}

      {hasFetched && templates.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-medium text-zinc-400">
            Select Template {boatClass && `(${boatClass})`}
          </div>

          <div className="grid gap-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`
                  p-3 rounded-lg border text-left transition-colors
                  ${template.id === selectedId
                    ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'}
                `}
              >
                <p className="text-sm font-medium text-white">{template.name}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {template.seats.filter(s => s.athleteId).length} / {template.seats.length} seats filled
                  </span>
                  {template.defaultBoat && (
                    <span className="text-zinc-500">
                      • {template.defaultBoat.name}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || !selectedId}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? 'Applying Template...' : 'Apply Template'}
          </button>
        </div>
      )}
    </div>
  );
}
