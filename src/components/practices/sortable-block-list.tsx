'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { InlineBlockEditor } from './inline-block-editor';
import { BlockTypeButtons } from './block-type-buttons';
import type { BlockType } from '@/generated/prisma';

interface Block {
  id: string;
  type: BlockType;
  title: string | null;
  notes: string | null;
  durationMinutes: number | null;
  category: string | null;
}

interface SortableBlockListProps {
  /** Array of blocks */
  blocks: Block[];
  /** Called when block order changes (drag or arrow) */
  onReorder: (blockIds: string[]) => void;
  /** Called to save block field updates */
  onSaveBlock: (blockId: string, updates: Partial<Block>) => Promise<void>;
  /** Called to delete a block */
  onDeleteBlock: (blockId: string) => void;
  /** Called to add a new block */
  onAddBlock: (type: BlockType) => void;
  /** Whether user is coach */
  isCoach?: boolean;
  /** Render function for block content (lineup, workout, etc.) */
  renderBlockContent?: (block: Block) => React.ReactNode;
}

/**
 * Sortable block list with drag-drop reordering.
 *
 * Features:
 * - Drag-drop via @dnd-kit
 * - Keyboard accessible (arrow keys)
 * - Up/down arrow buttons as alternative
 * - Empty state with helpful message
 */
export function SortableBlockList({
  blocks,
  onReorder,
  onSaveBlock,
  onDeleteBlock,
  onAddBlock,
  isCoach = false,
  renderBlockContent,
}: SortableBlockListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  // Sensors for drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts (prevents accidental)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Move block via arrow buttons
  const handleMoveBlock = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newOrder = arrayMove(blocks, index, newIndex);
    onReorder(newOrder.map(b => b.id));
  }, [blocks, onReorder]);

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(blocks, oldIndex, newIndex);
      onReorder(newOrder.map(b => b.id));
    }
  };

  // Find active block for overlay
  const activeBlock = activeId ? blocks.find(b => b.id === activeId) : null;

  return (
    <div className="space-y-4">
      {/* Block type buttons (coaches only) */}
      {isCoach && (
        <BlockTypeButtons onSelect={onAddBlock} />
      )}

      {/* Block list */}
      {blocks.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map(b => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {blocks.map((block, index) => (
                <InlineBlockEditor
                  key={block.id}
                  block={block}
                  position={index + 1}
                  onSave={onSaveBlock}
                  onDelete={onDeleteBlock}
                  onMoveUp={() => handleMoveBlock(index, 'up')}
                  onMoveDown={() => handleMoveBlock(index, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                  isCoach={isCoach}
                >
                  {renderBlockContent?.(block)}
                </InlineBlockEditor>
              ))}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay>
            {activeBlock && (
              <div className="opacity-80">
                <InlineBlockEditor
                  block={activeBlock}
                  position={blocks.findIndex(b => b.id === activeBlock.id) + 1}
                  onSave={async () => {}}
                  onDelete={() => {}}
                  isCoach={false}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
          <p className="text-zinc-500 text-sm">No blocks yet</p>
          {isCoach && (
            <p className="text-zinc-600 text-xs mt-1">
              Add a block to start planning this practice
            </p>
          )}
        </div>
      )}
    </div>
  );
}
