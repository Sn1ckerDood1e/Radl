'use client';

import { Waves, Dumbbell, Activity, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BlockType } from '@/generated/prisma';

interface BlockTypeButtonsProps {
  /** Called when a type is selected */
  onSelect: (type: BlockType) => void;
  /** Whether buttons are disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

const blockTypes: {
  value: BlockType;
  label: string;
  icon: typeof Waves;
  bgColor: string;
  textColor: string;
  borderColor: string;
  hoverBg: string;
}[] = [
  {
    value: 'WATER',
    label: 'Water',
    icon: Waves,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    hoverBg: 'hover:bg-blue-500/20',
  },
  {
    value: 'ERG',
    label: 'Erg',
    icon: Activity,
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    hoverBg: 'hover:bg-orange-500/20',
  },
  {
    value: 'LAND',
    label: 'Land',
    icon: Dumbbell,
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/30',
    hoverBg: 'hover:bg-green-500/20',
  },
  {
    value: 'MEETING',
    label: 'Meeting',
    icon: Users,
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    hoverBg: 'hover:bg-purple-500/20',
  },
];

/**
 * Direct type buttons for adding blocks.
 * Always visible per CONTEXT.md, no dropdown needed.
 *
 * @example
 * <BlockTypeButtons onSelect={(type) => addBlock(type)} />
 */
export function BlockTypeButtons({
  onSelect,
  disabled = false,
  className,
}: BlockTypeButtonsProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {blockTypes.map((type) => {
        const Icon = type.icon;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onSelect(type.value)}
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
              'border transition-colors',
              type.bgColor,
              type.textColor,
              type.borderColor,
              type.hoverBg,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>+ {type.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Helper to get block type config for styling.
 */
export function getBlockTypeConfig(type: BlockType) {
  return blockTypes.find(t => t.value === type) || blockTypes[0];
}
