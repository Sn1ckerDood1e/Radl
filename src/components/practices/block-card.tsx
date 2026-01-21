'use client';

import { useState } from 'react';
import { BlockType } from '@/generated/prisma';
import { Trash2, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';

interface BlockCardProps {
  block: {
    id?: string;
    tempId?: string;
    type: BlockType;
    durationMinutes?: number | null;
    category?: string | null;
    notes?: string | null;
  };
  position: number;
  onUpdate: (block: Partial<BlockCardProps['block']>) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  dragHandleProps?: object;
}

const blockTypeConfig: Record<BlockType, { label: string; bgColor: string; borderColor: string; textColor: string }> = {
  WATER: { label: 'Water', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
  LAND: { label: 'Land', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
  ERG: { label: 'Erg', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
};

export function BlockCard({
  block,
  position,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  dragHandleProps,
}: BlockCardProps) {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded so users can see edit fields
  const config = blockTypeConfig[block.type];

  const inputClassName = "mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100 placeholder-zinc-500 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm";
  const labelClassName = "block text-xs font-medium text-zinc-400";

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle / position */}
        <div
          className="flex items-center gap-2 text-zinc-500 cursor-grab"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
          <span className="text-sm font-medium text-zinc-400">{position}</span>
        </div>

        {/* Block type badge */}
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
          {config.label}
        </span>

        {/* Duration display */}
        {block.durationMinutes && (
          <span className="text-sm text-zinc-400">
            {block.durationMinutes} min
          </span>
        )}

        {/* Category display */}
        {block.category && (
          <span className="text-sm text-zinc-500">
            {block.category}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Move buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move up"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move down"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        {/* Expand/collapse button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
          title="Remove block"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
          <div className="pt-3 grid grid-cols-2 gap-3">
            {/* Duration */}
            <div>
              <label htmlFor={`duration-${block.id || block.tempId}`} className={labelClassName}>
                Duration (minutes)
              </label>
              <input
                type="number"
                id={`duration-${block.id || block.tempId}`}
                value={block.durationMinutes || ''}
                onChange={(e) => onUpdate({ durationMinutes: e.target.value ? parseInt(e.target.value) : null })}
                min={5}
                max={480}
                className={inputClassName}
                placeholder="30"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor={`category-${block.id || block.tempId}`} className={labelClassName}>
                Category
              </label>
              <input
                type="text"
                id={`category-${block.id || block.tempId}`}
                value={block.category || ''}
                onChange={(e) => onUpdate({ category: e.target.value || null })}
                maxLength={50}
                className={inputClassName}
                placeholder="e.g., Steady state, Sprint"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={`notes-${block.id || block.tempId}`} className={labelClassName}>
              Notes
            </label>
            <textarea
              id={`notes-${block.id || block.tempId}`}
              value={block.notes || ''}
              onChange={(e) => onUpdate({ notes: e.target.value || null })}
              rows={2}
              maxLength={500}
              className={inputClassName}
              placeholder="Additional instructions..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
