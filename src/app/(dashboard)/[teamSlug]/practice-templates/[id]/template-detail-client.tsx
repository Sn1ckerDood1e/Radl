'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplateForm } from '@/components/templates/template-form';
import type { BlockType } from '@/lib/validations/practice';

interface Template {
  id: string;
  name: string;
  defaultStartTime: string;
  defaultEndTime: string;
  blocks: Array<{
    id: string;
    type: BlockType;
    position: number;
    durationMinutes: number | null;
    category: string | null;
    notes: string | null;
  }>;
}

interface TemplateDetailClientProps {
  template: Template;
  teamSlug: string;
}

const blockTypeConfig: Record<BlockType, { label: string; bgColor: string; borderColor: string; textColor: string }> = {
  WATER: { label: 'Water', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
  LAND: { label: 'Land', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
  ERG: { label: 'Erg', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
  MEETING: { label: 'Meeting', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', textColor: 'text-purple-400' },
};

export function TemplateDetailClient({ template, teamSlug }: TemplateDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/practice-templates/${template.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete template');
      }

      router.push(`/${teamSlug}/practice-templates`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Edit Template</h1>
          <button
            onClick={() => setIsEditing(false)}
            className="text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
          >
            Cancel editing
          </button>
        </div>

        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <TemplateForm
            teamSlug={teamSlug}
            template={{
              id: template.id,
              name: template.name,
              defaultStartTime: template.defaultStartTime,
              defaultEndTime: template.defaultEndTime,
              blocks: template.blocks,
            }}
            onSuccess={() => {
              setIsEditing(false);
              router.refresh();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-6 p-4 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{template.name}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Default time: {template.defaultStartTime} - {template.defaultEndTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/${teamSlug}/practices/new?templateId=${template.id}`}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            Apply Template
          </Link>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400 mb-3">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
              {isDeleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 rounded text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template details */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6 space-y-6">
        {/* Blocks */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Template Blocks</h2>
          <div className="space-y-3">
            {template.blocks.map((block, index) => {
              const config = blockTypeConfig[block.type];
              return (
                <div
                  key={block.id}
                  className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-500">{index + 1}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
                      {config.label}
                    </span>
                    {block.durationMinutes && (
                      <span className="text-sm text-zinc-400">{block.durationMinutes} min</span>
                    )}
                    {block.category && (
                      <span className="text-sm text-zinc-500">{block.category}</span>
                    )}
                  </div>
                  {block.notes && (
                    <p className="mt-2 text-sm text-zinc-400">{block.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
