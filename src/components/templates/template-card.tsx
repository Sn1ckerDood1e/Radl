'use client';

import Link from 'next/link';
import { Clock, Layers } from 'lucide-react';
import type { BlockType } from '@/lib/validations/practice';

interface TemplateCardProps {
  template: {
    id: string;
    name: string;
    defaultStartTime: string;
    defaultEndTime: string;
    blocks: Array<{ type: BlockType }>;
  };
  teamSlug: string;
}

function getBlockSummary(blocks: Array<{ type: BlockType }>): string {
  const counts: Record<BlockType, number> = {
    WATER: 0,
    LAND: 0,
    ERG: 0,
    MEETING: 0,
  };

  blocks.forEach((block) => {
    counts[block.type]++;
  });

  const parts: string[] = [];
  if (counts.WATER > 0) parts.push(`${counts.WATER} Water`);
  if (counts.LAND > 0) parts.push(`${counts.LAND} Land`);
  if (counts.ERG > 0) parts.push(`${counts.ERG} Erg`);
  if (counts.MEETING > 0) parts.push(`${counts.MEETING} Meeting`);

  return parts.join(', ');
}

export function TemplateCard({ template, teamSlug }: TemplateCardProps) {
  const blockSummary = getBlockSummary(template.blocks);

  return (
    <Link
      href={`/${teamSlug}/practice-templates/${template.id}`}
      className="block p-4 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
    >
      <h3 className="text-lg font-medium text-white mb-2">{template.name}</h3>

      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span>{template.defaultStartTime} - {template.defaultEndTime}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-zinc-500" />
          <span>{template.blocks.length} blocks{blockSummary ? `: ${blockSummary}` : ''}</span>
        </div>
      </div>
    </Link>
  );
}
