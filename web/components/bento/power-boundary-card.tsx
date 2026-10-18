'use client';

import { short } from '@/lib/api';
import { SpatialCard } from '@/components/spatial-card';
import { Shield, Check, X, KeyRound } from 'lucide-react';

export function PowerBoundaryCard({ owner }: { owner?: string }) {
  return (
    <SpatialCard className="p-5">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
            <span className="label font-bold text-slate-800 dark:text-ink-300">Protection Guarantees</span>
          </div>
          <span className="font-mono text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">
            Hard Boundaries
          </span>
        </div>

        <ul className="space-y-2.5 text-xs">
          <li className="flex items-start gap-2.5 text-slate-800 dark:text-ink-100 font-medium">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span>Auto-pays trusted payees within your set daily limit</span>
          </li>

          <li className="flex items-start gap-2.5 text-slate-800 dark:text-ink-100 font-medium">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Check className="h-2.5 w-2.5" />
            </div>
            <span>Freezes all payments instantly if anything looks suspicious</span>
          </li>

          <li className="flex items-start gap-2.5 text-slate-700 dark:text-ink-300 font-medium">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
              <X className="h-2.5 w-2.5" />
            </div>
            <span>Cannot raise limits, add new payees, or unfreeze itself</span>
          </li>

          <li className="flex items-start gap-2.5 text-slate-700 dark:text-ink-300 font-medium">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
              <X className="h-2.5 w-2.5" />
            </div>
            <span>Never sends funds to strangers without your explicit approval</span>
          </li>
        </ul>

        {owner && (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 text-[11px] text-slate-700 dark:border-white/[0.04] dark:bg-ink-900/60 dark:text-ink-400">
            <KeyRound className="h-3.5 w-3.5 text-emerald-600 dark:text-lime-400 shrink-0" />
            <div className="truncate">
              Your Owner Wallet:{' '}
              <span className="font-mono text-slate-900 dark:text-ink-200 font-bold">{short(owner, 6)}</span>
            </div>
          </div>
        )}
      </div>
    </SpatialCard>
  );
}
