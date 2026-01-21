'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Layers } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  blockCount: number;
}

interface ApplyTemplateSectionProps {
  templates: Template[];
  seasonId: string;
  teamSlug: string;
  selectedTemplateId?: string;
}

export function ApplyTemplateSection({
  templates,
  seasonId,
  teamSlug,
  selectedTemplateId,
}: ApplyTemplateSectionProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(selectedTemplateId || null);
  const [date, setDate] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const handleApply = async () => {
    if (!selectedId || !date) {
      setError('Please select a template and date');
      return;
    }

    setIsApplying(true);
    setError(null);

    try {
      // Create ISO datetime string for the date
      const practiceDate = new Date(date + 'T00:00:00');

      const response = await fetch('/api/practice-templates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedId,
          seasonId,
          date: practiceDate.toISOString(),
          name: name || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply template');
      }

      // Redirect to the created practice
      router.push(`/${teamSlug}/practices/${result.practice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsApplying(false);
    }
  };

  const inputClassName = "block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm [color-scheme:dark]";

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}

      {/* Template selection */}
      <div className="grid gap-2 sm:grid-cols-2">
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
                <Clock className="h-3 w-3" />
                {template.defaultStartTime} - {template.defaultEndTime}
              </span>
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {template.blockCount} blocks
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Apply form - shows when template selected */}
      {selectedId && (
        <div className="pt-4 border-t border-zinc-700 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="practice-date" className="block text-xs font-medium text-zinc-400 mb-1">
                Practice Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                id="practice-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="practice-name" className="block text-xs font-medium text-zinc-400 mb-1">
                Practice Name (optional)
              </label>
              <input
                type="text"
                id="practice-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={selectedTemplate?.name || 'Template name'}
                className={inputClassName}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying || !date}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isApplying ? 'Creating Practice...' : 'Create Practice from Template'}
          </button>
        </div>
      )}
    </div>
  );
}
