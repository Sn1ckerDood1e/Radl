'use client';

import { useState } from 'react';
import { nanoid } from 'nanoid';
import { BlockCard } from './block-card';
import { Plus } from 'lucide-react';
import { BlockType } from '@/generated/prisma';

interface Block {
  id?: string;
  tempId?: string;
  type: BlockType;
  durationMinutes?: number | null;
  category?: string | null;
  notes?: string | null;
}

interface BlockEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

const blockTypes: { value: BlockType; label: string; description: string }[] = [
  { value: 'WATER', label: 'Water', description: 'On-water rowing session' },
  { value: 'LAND', label: 'Land', description: 'Land-based training' },
  { value: 'ERG', label: 'Erg', description: 'Ergometer workout' },
];

export function BlockEditor({ blocks, onChange }: BlockEditorProps) {
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const addBlock = (type: BlockType) => {
    const newBlock: Block = {
      tempId: nanoid(),
      type,
      durationMinutes: null,
      category: null,
      notes: null,
    };
    onChange([...blocks, newBlock]);
    setShowTypeSelector(false);
  };

  const updateBlock = (index: number, updates: Partial<Block>) => {
    const newBlocks = [...blocks];
    newBlocks[index] = { ...newBlocks[index], ...updates };
    onChange(newBlocks);
  };

  const removeBlock = (index: number) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return;
    }

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    onChange(newBlocks);
  };

  return (
    <div className="space-y-4">
      {/* Block list */}
      {blocks.length > 0 ? (
        <div className="space-y-3">
          {blocks.map((block, index) => (
            <BlockCard
              key={block.id || block.tempId}
              block={block}
              position={index + 1}
              onUpdate={(updates) => updateBlock(index, updates)}
              onRemove={() => removeBlock(index)}
              onMoveUp={() => moveBlock(index, 'up')}
              onMoveDown={() => moveBlock(index, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < blocks.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 border border-dashed border-zinc-700 rounded-lg">
          <p className="text-zinc-500 text-sm">No blocks added yet</p>
          <p className="text-zinc-600 text-xs mt-1">Add at least one block to the practice</p>
        </div>
      )}

      {/* Add block button / type selector */}
      {showTypeSelector ? (
        <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
          <p className="text-sm text-zinc-300 mb-3">Select block type:</p>
          <div className="flex flex-wrap gap-2">
            {blockTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => addBlock(type.value)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${type.value === 'WATER' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30' : ''}
                  ${type.value === 'LAND' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30' : ''}
                  ${type.value === 'ERG' ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30' : ''}
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowTypeSelector(false)}
            className="mt-3 text-xs text-zinc-500 hover:text-zinc-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowTypeSelector(true)}
          className="w-full py-3 border border-dashed border-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-300 hover:border-zinc-600 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Block</span>
        </button>
      )}
    </div>
  );
}
