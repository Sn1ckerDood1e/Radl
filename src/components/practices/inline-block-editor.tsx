'use client';

import { useState } from 'react';
import { GripVertical, ChevronUp, ChevronDown, Trash2, ChevronRight, ChevronDown as ChevronExpand } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { InlineTextField } from '@/components/shared/inline-text-field';
import { InlineTextarea } from '@/components/shared/inline-textarea';
import { getBlockTypeConfig } from './block-type-buttons';
import type { BlockType } from '@/generated/prisma';

interface Block {
  id: string;
  type: BlockType;
  title: string | null;
  notes: string | null;
  durationMinutes: number | null;
  category: string | null;
}

interface InlineBlockEditorProps {
  /** Block data */
  block: Block;
  /** Position in list (1-based) */
  position: number;
  /** Save handler for field updates */
  onSave: (blockId: string, updates: Partial<Block>) => Promise<void>;
  /** Delete handler */
  onDelete: (blockId: string) => void;
  /** Move up handler */
  onMoveUp?: () => void;
  /** Move down handler */
  onMoveDown?: () => void;
  /** Whether this block can move up */
  canMoveUp?: boolean;
  /** Whether this block can move down */
  canMoveDown?: boolean;
  /** Whether user is coach (can edit) */
  isCoach?: boolean;
  /** Expanded content (lineup, workout, etc.) */
  children?: React.ReactNode;
}

/**
 * Inline block editor with drag handle, arrows, and autosave fields.
 *
 * Layout:
 * - Drag handle on left (coaches only)
 * - Type badge + position number
 * - Title (inline editable)
 * - Up/down arrows + delete (coaches only)
 * - Expandable section for lineup/workout
 */
export function InlineBlockEditor({
  block,
  position,
  onSave,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isCoach = false,
  children,
}: InlineBlockEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const typeConfig = getBlockTypeConfig(block.type);
  const Icon = typeConfig.icon;

  // Sortable hook for drag-drop
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !isCoach });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Save wrapper that tracks saving state
  const handleSave = async (updates: Partial<Block>) => {
    setIsSaving(true);
    try {
      await onSave(block.id, updates);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border transition-all',
        typeConfig.bgColor,
        typeConfig.borderColor,
        isDragging && 'opacity-50 shadow-lg ring-2 ring-teal-500'
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle (coaches only) */}
        {isCoach && (
          <button
            {...attributes}
            {...listeners}
            className="p-1 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        {/* Position number */}
        <span className="text-sm font-medium text-zinc-500 w-5">
          {position}
        </span>

        {/* Type badge */}
        <span className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
          typeConfig.bgColor,
          typeConfig.textColor,
          'border',
          typeConfig.borderColor
        )}>
          <Icon className="h-3 w-3" />
          {typeConfig.label}
        </span>

        {/* Title (inline editable) */}
        <div className="flex-1 min-w-0">
          {isCoach ? (
            <InlineTextField
              value={block.title || ''}
              onSave={(title) => handleSave({ title: title || null })}
              placeholder={`${typeConfig.label} block...`}
              isPending={isSaving}
              className="text-sm font-medium"
              aria-label="Block title"
            />
          ) : (
            <span className="text-sm font-medium text-zinc-200 truncate">
              {block.title || `${typeConfig.label} block`}
            </span>
          )}
        </div>

        {/* Actions (coaches only) */}
        {isCoach && (
          <div className="flex items-center gap-1">
            {/* Expand/collapse toggle */}
            {children && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronExpand className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Up arrow */}
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            {/* Down arrow */}
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Move down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => onDelete(block.id)}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              aria-label="Delete block"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Notes field (always visible if has notes, expandable for coaches) */}
      {(block.notes || isCoach) && (
        <div className="px-3 pb-3 border-t border-zinc-700/30">
          {isCoach ? (
            <InlineTextarea
              value={block.notes || ''}
              onSave={(notes) => handleSave({ notes: notes || null })}
              placeholder="Add notes..."
              isPending={isSaving}
              rows={1}
              autoResize
              className="text-sm mt-2"
              aria-label="Block notes"
            />
          ) : block.notes ? (
            <p className="text-sm text-zinc-400 mt-2 whitespace-pre-wrap">
              {block.notes}
            </p>
          ) : null}
        </div>
      )}

      {/* Expanded content (lineup, workout, etc.) */}
      {isExpanded && children && (
        <div className="border-t border-zinc-700/30 p-3">
          {children}
        </div>
      )}
    </div>
  );
}
