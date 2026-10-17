'use client';

import type { Tier } from '@/lib/types';

const STYLES: Record<Tier, { label: string; className: string; dot: string }> = {
  T1: { label: 'PROPOSE ONLY', className: 'border-sky/30 bg-sky/10 text-sky', dot: 'bg-sky' },
  T2: { label: 'AUTO-EXECUTED', className: 'border-mint/30 bg-mint/10 text-mint', dot: 'bg-mint' },
  T3: { label: 'APPROVAL REQUIRED', className: 'border-amber/30 bg-amber/10 text-amber', dot: 'bg-amber' },
  BLOCK: { label: 'BLOCKED', className: 'border-rose/30 bg-rose/10 text-rose', dot: 'bg-rose' },
};

export function TierChip({ tier, small }: { tier: Tier; small?: boolean }) {
  const s = STYLES[tier];
  return (
    <span className={`chip ${s.className} ${small ? '' : 'px-2.5 py-1 text-[10px]'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function tierStyle(tier: Tier) {
  return STYLES[tier];
}
