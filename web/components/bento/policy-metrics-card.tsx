'use client';

import { useState } from 'react';
import type { AgentState } from '@/lib/types';
import { api } from '@/lib/api';
import { SpatialCard } from '@/components/spatial-card';
import { useOwnerSigner } from '@/components/wallet';
import { useToast } from '@/components/ui/toast';
import {
  Gauge,
  Zap,
  Cpu,
  AlertTriangle,
  Sliders,
  Check,
  X,
  Loader2,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';

export function PolicyMetricsCard({
  state,
  refresh,
}: {
  state: AgentState | null;
  refresh?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [perTx, setPerTx] = useState(state?.perTxCap ?? '50');
  const [daily, setDaily] = useState(state?.dailyCap ?? '150');
  const [saving, setSaving] = useState(false);

  const signOwner = useOwnerSigner();
  const toast = useToast();

  const used = Number(state?.spentToday ?? '0');
  const cap = Number(state?.dailyCap ?? '1');
  const pct = Math.min(100, Math.round((used / (cap || 1)) * 100));

  const perTxNum = Number(perTx) || 0;
  const dailyNum = Number(daily) || 0;
  const isInvalid = perTxNum <= 0 || dailyNum <= 0 || perTxNum > dailyNum;

  const meterColor =
    pct > 80
      ? 'from-rose-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
      : pct > 50
      ? 'from-amber-500 to-amber-600 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
      : 'from-emerald-500 to-emerald-600 dark:from-lime-400 dark:to-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]';

  const safetyActive = Boolean(state && state.safetyModeUntil > Date.now());

  const handleOpenEdit = () => {
    setPerTx(state?.perTxCap ?? '50');
    setDaily(state?.dailyCap ?? '150');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (isInvalid) return;
    setSaving(true);
    try {
      const res = await api.updateCaps(perTx, daily);
      if (res.mode === 'live' && res.call) {
        toast.info('Owner Signature Required', 'Please confirm the policy update transaction in your wallet.');
        await signOwner(res.call);
      }
      toast.success(
        'Policy Limits Enforced',
        `Single payment cap updated to ${perTx} ${state?.token.symbol ?? 'USDC'}, Daily to ${daily} ${state?.token.symbol ?? 'USDC'}.`,
      );
      setIsEditing(false);
      refresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Limit Update Failed', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SpatialCard className="p-4.5 sm:p-5">
      <div className="space-y-4">
        {/* Card Title & Adjust Action */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
            <span className="label font-bold text-slate-800 dark:text-ink-300">
              Spending Rules & Limits
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={handleOpenEdit}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300 hover:bg-emerald-500/20 dark:hover:bg-lime-400/20 active:scale-95 transition-all shadow-sm"
                title="Adjust your policy spending caps"
              >
                <Sliders className="h-3 w-3 transition-transform group-hover:rotate-45" />
                <span>Adjust Limits</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                <X className="h-3 w-3" />
                <span>Close</span>
              </button>
            )}
          </div>
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

        {/* Interactive Limit & Cap Setting Drawer */}
        {isEditing && (
          <div className="animate-rise rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-indigo-500/[0.04] p-3.5 sm:p-4 space-y-4 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
                <span>Configure Policy Safeguards</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                Owner Authority Only
              </span>
            </div>

            {/* Input 1: Single Payment Limit (perTxCap) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Single Payment Auto-Approval Limit
                </label>
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-lime-400">
                  {perTx} {state?.token.symbol ?? 'USDC'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Any payment above this amount automatically halts and requires your explicit approval.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={perTxNum || 50}
                  onChange={(e) => setPerTx(e.target.value)}
                  className="w-full accent-emerald-500 dark:accent-lime-400 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  value={perTx}
                  onChange={(e) => setPerTx(e.target.value)}
                  className="w-20 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 dark:text-white text-right shadow-sm focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Presets:</span>
                {['25', '50', '100', '250'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPerTx(val)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold transition-all ${
                      perTx === val
                        ? 'border border-emerald-500/50 bg-emerald-500/20 text-emerald-800 dark:text-lime-300'
                        : 'border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {val} USDC
                  </button>
                ))}
              </div>
            </div>

            {/* Input 2: 24h Rolling Daily Allowance (dailyCap) */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  24-Hour Rolling Budget Limit
                </label>
                <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                  {daily} {state?.token.symbol ?? 'USDC'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Maximum cumulative funds the assistant may disburse automatically in a 24-hour window.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="range"
                  min="20"
                  max="1500"
                  step="10"
                  value={dailyNum || 150}
                  onChange={(e) => setDaily(e.target.value)}
                  className="w-full accent-indigo-500 dark:accent-indigo-400 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg cursor-pointer"
                />
                <input
                  type="number"
                  min="1"
                  value={daily}
                  onChange={(e) => setDaily(e.target.value)}
                  className="w-20 rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-slate-900 dark:text-white text-right shadow-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Presets:</span>
                {['100', '150', '300', '600'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDaily(val)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold transition-all ${
                      daily === val
                        ? 'border border-indigo-500/50 bg-indigo-500/20 text-indigo-800 dark:text-indigo-300'
                        : 'border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {val} USDC
                  </button>
                ))}
              </div>
            </div>

            {/* Validation & Safety Preview */}
            {perTxNum > dailyNum ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 p-2.5 text-xs text-rose-800 dark:text-rose-300 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Single payment limit cannot exceed the 24-hour daily budget allowance.</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 text-[11px] text-slate-700 dark:text-slate-300">
                <Info className="h-3.5 w-3.5 text-emerald-600 dark:text-lime-400 shrink-0" />
                <span>
                  Untrusted invoice auto-pay cap will automatically set to 10%: <strong className="font-mono text-emerald-700 dark:text-lime-300">${(perTxNum * 0.1).toFixed(1)} USDC</strong>
                </span>
              </div>
            )}

            {/* Save & Cancel Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="btn-ghost !py-2 !px-3.5 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isInvalid || saving}
                className="btn-primary !py-2 !px-4 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Updating Policy…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Enforce Limits</span>
                  </>
                )}
              </button>
            </div>
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
            <span>
              {Math.max(0, cap - used)} {state?.token.symbol ?? 'USDC'} available
            </span>
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
              {state?.perTxCap ?? '50'}{' '}
              <span className="text-xs text-slate-600 dark:text-ink-400">
                {state?.token.symbol ?? 'USDC'}
              </span>
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

