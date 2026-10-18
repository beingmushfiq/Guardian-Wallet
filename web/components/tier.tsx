'use client';

import React from 'react';
import type { Tier } from '@/lib/types';
import { CheckCircle2, AlertTriangle, ShieldX, Info } from 'lucide-react';

interface TierConfig {
  label: string;
  className: string;
  dot: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STYLES: Record<Tier, TierConfig> = {
  T1: {
    label: 'PROPOSAL ONLY',
    className:
      'border-sky-400/35 bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/30',
    dot: 'bg-sky-500 dark:bg-sky-400',
    icon: Info,
  },
  T2: {
    label: 'AUTO-APPROVED',
    className:
      'border-emerald-500/35 bg-emerald-50 text-emerald-800 dark:bg-lime-400/10 dark:text-lime-300 dark:border-lime-400/35',
    dot: 'bg-emerald-600 dark:bg-lime-400',
    icon: CheckCircle2,
  },
  T3: {
    label: 'APPROVAL NEEDED',
    className:
      'border-amber-500/35 bg-amber-50 text-amber-900 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/35',
    dot: 'bg-amber-500 dark:bg-amber-400',
    icon: AlertTriangle,
  },
  BLOCK: {
    label: 'BLOCKED BY RULES',
    className:
      'border-rose-500/35 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/35',
    dot: 'bg-rose-600 dark:bg-rose-500',
    icon: ShieldX,
  },
};

export function TierChip({ tier, small }: { tier: Tier; small?: boolean }) {
  const s = STYLES[tier] ?? STYLES.T1;
  const Icon = s.icon;
  return (
    <span
      className={`chip font-mono font-semibold tracking-wide ${s.className} ${
        small ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <Icon className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {s.label}
    </span>
  );
}

export function tierStyle(tier: Tier) {
  return STYLES[tier] ?? STYLES.T1;
}
