'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronDown, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutType } from '@/lib/validations/workout';

interface WorkoutTemplate {
  id: string;
  name: string;
  type: WorkoutType;
  notes: string | null;
  intervals: Array<{
    position: number;
    durationType: string;
    duration: number;
    targetSplit: string | null;
    targetStrokeRate: number | null;
    restDuration: number;
    restType: string;
  }>;
}

interface WorkoutTemplatePickerProps {
  /** Called when a template is selected */
  onSelect: (template: WorkoutTemplate) => void;
  /** Filter templates by block type context */
  blockType: 'ERG' | 'WATER';
  /** Currently selected template ID (optional) */
  selectedId?: string;
}

/**
 * Dropdown picker for applying workout templates to blocks.
 *
 * Features:
 * - Fetches templates from API
 * - Shows template name and interval count
 * - Preview on hover (future enhancement)
 */
export function WorkoutTemplatePicker({
  onSelect,
  blockType,
  selectedId,
}: WorkoutTemplatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch templates when dropdown opens
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/workout-templates');
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      setTemplates(data.templates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (template: WorkoutTemplate) => {
    onSelect(template);
    setIsOpen(false);
  };

  // Format workout type for display
  const formatType = (type: WorkoutType) => {
    return type.replace(/_/g, ' ').toLowerCase();
  };

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
      >
        <FileText className="h-4 w-4" />
        <span>Apply Template</span>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop to close */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-3 text-sm text-red-400">
                {error}
                <button
                  onClick={fetchTemplates}
                  className="ml-2 text-zinc-400 hover:text-zinc-300 underline"
                >
                  Retry
                </button>
              </div>
            ) : templates.length === 0 ? (
              <div className="p-3 text-sm text-zinc-500">
                No templates saved yet
              </div>
            ) : (
              <div className="py-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-zinc-800 flex items-center justify-between gap-2',
                      selectedId === template.id && 'bg-zinc-800'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-200 truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatType(template.type)} • {template.intervals.length} interval{template.intervals.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {selectedId === template.id && (
                      <Check className="h-4 w-4 text-teal-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
