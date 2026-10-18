'use client';

import { useState } from 'react';
import { api, short } from '@/lib/api';
import type { AgentState } from '@/lib/types';
import { VaultShieldHUD } from '@/components/vault-shield-hud';
import { SpatialCard } from '@/components/spatial-card';
import { useToast } from '@/components/ui/toast';
import { Lock, ShieldAlert, ExternalLink, Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export function VaultCoreCard({
  state,
  refresh,
  onPaused,
  hasPending = false,
}: {
  state: AgentState | null;
  refresh: () => void;
  onPaused: () => void;
  hasPending?: boolean;
}) {
  const [pausing, setPausing] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function pause() {
    if (
      !confirm(
        'Emergency Action: Freeze all payments?\n\nThe assistant will be immediately blocked from sending funds until you unfreeze it from your wallet.'
      )
    )
      return;
    setPausing(true);
    setError('');
    try {
      await api.pause();
      toast.warning('Vault Frozen', 'All outbound payments have been immediately blocked.');
      refresh();
      onPaused();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      toast.error('Emergency Action Failed', err);
    } finally {
      setPausing(false);
    }
  }

  const isPaused = Boolean(state?.paused);
  const visualStatus: 'safe' | 'pending' | 'paused' = isPaused
    ? 'paused'
    : hasPending
    ? 'pending'
    : 'safe';

  return (
    <SpatialCard
      className={`p-5 transition-all duration-300 ${
        isPaused
          ? 'border-rose-500/40 dark:border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)]'
          : hasPending
          ? 'border-amber-500/35 dark:border-amber-400/30'
          : ''
      }`}
      glowColor={
        isPaused
          ? 'rgba(244, 63, 94, 0.12)'
          : hasPending
          ? 'rgba(245, 158, 11, 0.1)'
          : 'rgba(16, 185, 129, 0.08)'
      }
    >
      <div className="relative">
        {/* Header Ribbon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="label font-bold text-slate-800 dark:text-ink-200">Protected Vault</span>
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isPaused
                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  : hasPending
                  ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-emerald-500 dark:bg-lime-400 shadow-[0_0_8px_#34d399]'
              } animate-pulseSoft`}
            />
          </div>

          <span
            className={`chip font-mono text-[9px] font-bold ${
              state?.mode === 'live'
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'border-sky-500/30 bg-sky-50 text-sky-800 dark:bg-sky-400/10 dark:text-sky-300'
            }`}
          >
            {state?.mode === 'live' ? 'LIVE VAULT' : 'PRACTICE MODE'}
          </span>
        </div>

        {/* Biometric Holographic Shield HUD (Crisp Vector Alternative to 3D Canvas) */}
        <div className="relative my-3 h-52 w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-100/70 via-emerald-50/25 to-slate-100/40 p-2 dark:border-white/[0.06] dark:from-white/[0.04] dark:via-lime-400/[0.02] dark:to-transparent shadow-inner">
          <VaultShieldHUD status={visualStatus} className="h-full w-full" />
        </div>

        {/* Balance Display */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-white/[0.05] dark:bg-ink-900/50 backdrop-blur-md">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-ink-400">
            Available Balance
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white lg:text-4xl">
              {state?.balance ?? '—'}
            </span>
            <span className="font-mono text-sm font-bold text-emerald-600 dark:text-lime-400">
              {state?.token.symbol ?? 'USDC'}
            </span>
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-ink-400">
            {state?.mode === 'live' && state.vault ? (
              <a
                href={state.explorerVault ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-slate-700 dark:text-ink-300 hover:text-emerald-600 dark:hover:text-lime-300 font-medium"
              >
                <span>vault {short(state.vault, 6)}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="font-medium text-slate-600 dark:text-ink-400">
                Practice mode · Same rules as live vault
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              Protected
            </span>
          </div>
        </div>

        {/* Emergency Pause Controls */}
        <div className="mt-3.5">
          {isPaused ? (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 dark:border-rose-500/40 dark:bg-rose-500/10">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                <Lock className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span>VAULT TEMPORARILY FROZEN</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-rose-900/80 dark:text-rose-200/80 font-medium">
                All outgoing payments are frozen. Connect your owner wallet above whenever you want to unfreeze.
              </p>
            </div>
          ) : (
            <button
              className="btn-danger w-full !py-2.5 !px-4 text-xs font-bold tracking-wider uppercase shadow-sm"
              onClick={pause}
              disabled={pausing}
              title="Immediately freeze all outgoing transactions in case of emergency"
            >
              {pausing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Freezing Vault…</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>Freeze All Payments (Emergency)</span>
                </>
              )}
            </button>
          )}
          {error && <p className="mt-2 text-center text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
        </div>
      </div>
    </SpatialCard>
  );
}
