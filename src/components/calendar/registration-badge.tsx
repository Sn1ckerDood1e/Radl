'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { RCRegistrationStatus } from '@/lib/regatta-central/types';

const registrationBadgeVariants = cva(
  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
  {
    variants: {
      status: {
        OPEN: 'bg-teal-500/20 text-teal-400',
        CLOSED: 'bg-zinc-500/20 text-zinc-400',
        WAITLIST: 'bg-amber-500/20 text-amber-400',
        NOT_AVAILABLE: 'bg-zinc-500/20 text-zinc-500',
      },
    },
    defaultVariants: {
      status: 'NOT_AVAILABLE',
    },
  }
);

const statusLabels: Record<RCRegistrationStatus, string> = {
  OPEN: 'Open',
  CLOSED: 'Closed',
  WAITLIST: 'Waitlist',
  NOT_AVAILABLE: 'N/A',
};

interface RegistrationBadgeProps extends VariantProps<typeof registrationBadgeVariants> {
  status: RCRegistrationStatus;
  className?: string;
}

export function RegistrationBadge({ status, className }: RegistrationBadgeProps) {
  return (
    <span className={registrationBadgeVariants({ status, className })}>
      {statusLabels[status]}
    </span>
  );
}
