'use client';

import type { AgentState } from '@/lib/types';
import { SpatialCard } from '@/components/spatial-card';
import { Gauge, Zap, Cpu, AlertTriangle } from 'lucide-react';

export function PolicyMetricsCard({ state }: { state: AgentState | null }) {
  const used = Number(state?.spentToday ?? '0');
  const cap = Number(state?.dailyCap ?? '1');
  const pct = Math.min(100, Math.round((used / (cap || 1)) * 100));

  const meterColor =
    pct > 80
      ? 'from-rose-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
      : pct > 50
      ? 'from-amber-500 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
      : 'from-emerald-500 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]';

  const safetyActive = Boolean(state && state.safetyModeUntil > Date.now());

  return (
    <SpatialCard className="p-5">
      <div className="space-y-4">
        {/* Card Title */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
            <span className="label font-bold text-slate-800 dark:text-ink-300">Spending Rules & Limits</span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            Rules Active
          </span>
        </div>

        {/* Safety Mode Alert if active */}
        {safetyActive && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-400/10 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>CAUTION MODE ACTIVE</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80 font-medium">
              A suspicious request was recently detected. To keep your funds safe, all new payments will ask for your personal approval.
            </p>
          </div>
        )}

        {/* Daily Auto-Approval Meter */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/[0.05] dark:bg-ink-900/50">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-bold text-slate-800 dark:text-ink-200">
              Daily Auto-Pay Allowance
            </span>
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {state?.spentToday ?? '0'}{' '}
              <span className="font-medium text-slate-500 dark:text-ink-400">
                / {state?.dailyCap ?? '150'} {state?.token.symbol ?? 'USDC'}
              </span>
            </span>
          </div>

          {/* Progress Bar */}
          <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-black/50 p-[1px]">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${meterColor} transition-all duration-700 ease-out`}
              style={{ width: `${Math.max(4, pct)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] font-mono font-medium text-slate-600 dark:text-ink-400">
            <span>{pct}% used today</span>
            <span>{Math.max(0, cap - used)} {state?.token.symbol ?? 'USDC'} available</span>
          </div>
        </div>

        {/* Sub-Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/[0.05] dark:bg-ink-900/40">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-ink-400">
              <Zap className="h-3 w-3 text-sky-600 dark:text-sky-400" />
              Single Payment Limit
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">
              {state?.perTxCap ?? '50'} <span className="text-xs text-slate-600 dark:text-ink-400">{state?.token.symbol ?? 'USDC'}</span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/[0.05] dark:bg-ink-900/40">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-ink-400">
              <Cpu className="h-3 w-3 text-emerald-600 dark:text-lime-400" />
              Assistant Engine
            </div>
            <div className="mt-1 font-mono text-xs font-bold text-emerald-700 dark:text-lime-300">
              {state?.planner === 'llm' ? 'Smart AI Planner' : 'Safe Preset Rules'}
            </div>
          </div>
        </div>
      </div>
    </SpatialCard>
  );
}
