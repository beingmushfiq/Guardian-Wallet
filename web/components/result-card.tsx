'use client';

import { useState } from 'react';
import { api, short } from '@/lib/api';
import type { TurnRow } from '@/lib/types';
import { TierChip, tierStyle } from './tier';
import { useOwnerSigner } from './wallet';
import { useToast } from '@/components/ui/toast';
import {
  Check,
  X,
  ShieldCheck,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export function ResultCard({ row, onDone }: { row: TurnRow; onDone: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [hash, setHash] = useState(row.txHash);
  const signOwner = useOwnerSigner();
  const toast = useToast();
  const style = tierStyle(row.tier);

  async function approve() {
    setBusy('approve');
    setError('');
    try {
      let txHash: string | undefined;
      if (row.mode === 'live') {
        const payload = await api.approval(row.intentId);
        txHash = await signOwner(payload.call);
      }
      const out = await api.approve(row.intentId, txHash);
      setHash(out.txHash);
      toast.success('Payment Approved', `Successfully sent ${row.amountHuman} ${row.tokenSymbol}`);
      onDone();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      toast.error('Approval Failed', err);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy('reject');
    setError('');
    try {
      await api.reject(row.intentId);
      toast.info('Payment Rejected', `Cancelled payment of ${row.amountHuman} ${row.tokenSymbol}`);
      onDone();
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      toast.error('Action Failed', err);
    } finally {
      setBusy(null);
    }
  }

  const borderClass =
    row.tier === 'T2'
      ? 'border-emerald-500/35 dark:border-lime-400/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
      : row.tier === 'T3'
      ? 'border-amber-500/35 dark:border-amber-400/30 shadow-[0_0_20px_rgba(245,158,11,0.12)]'
      : row.tier === 'BLOCK'
      ? 'border-rose-500/35 dark:border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
      : 'border-sky-500/35 dark:border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.12)]';

  const riskPct = Math.round((row.riskScore || 0) * 100);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white/90 dark:bg-ink-850/80 p-4.5 shadow-sm backdrop-blur-xl transition-all duration-300 ${borderClass}`}
    >
      {/* Top Accent Rim */}
      <div className={`absolute inset-x-0 top-0 h-1 ${style.dot} opacity-80`} />

      <div className="space-y-3.5">
        {/* Tier Header and Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TierChip tier={row.tier} />
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-ink-400">
              {row.mode === 'live' ? 'Live Vault' : 'Practice Mode'}
            </span>
            {hash && (
              <span className="chip border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.04] font-mono text-[9px] dark:text-ink-300">
                tx {short(hash, 4)}
              </span>
            )}
          </div>
        </div>

        {/* Amount & Destination */}
        <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.05] dark:bg-ink-900/60 p-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {row.amountHuman}
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-lime-400">{row.tokenSymbol}</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-700 dark:text-ink-300">
              <span className="font-semibold text-slate-900 dark:text-ink-100">
                {row.contactName ? `To ${row.contactName}` : 'To new recipient'}
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-ink-400">({short(row.to, 5)})</span>
            </div>
          </div>

          {/* Safety Evaluation Score */}
          {row.riskScore > 0 && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-ink-400">
                <span>RISK</span>
                <span className="font-bold text-slate-900 dark:text-white">{riskPct}%</span>
              </div>
              <div className="mt-1 h-1.5 w-18 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    riskPct > 65 ? 'bg-rose-500' : riskPct > 35 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(5, riskPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Security Rule Check Box */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-100/70 dark:border-white/[0.06] dark:bg-black/35 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-ink-400">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Security Rule Check
          </div>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-900 dark:text-ink-100">
            {row.reasons[0]}
          </p>
          {row.reasons.length > 1 && (
            <ul className="mt-2 space-y-1 border-t border-slate-200/60 dark:border-white/[0.04] pt-2">
              {row.reasons.slice(1).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-700 dark:text-ink-300">
                  <span className="text-emerald-600 dark:text-lime-400 font-bold">›</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Security Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {row.flags.map((f) => (
            <span
              key={f}
              className="chip border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02] font-mono text-[10px] text-slate-700 dark:text-ink-300"
            >
              {f.toLowerCase().replaceAll('_', ' ')}
            </span>
          ))}
        </div>

        {/* User Request Reason */}
        {row.reason && (
          <p className="border-l-2 border-slate-300 dark:border-white/20 pl-2.5 text-xs italic leading-relaxed text-slate-600 dark:text-ink-400">
            “{row.reason}”
          </p>
        )}

        {/* Action Controls for Pending Approvals */}
        {row.status === 'pending' && (
          <div className="pt-1">
            <div className="flex gap-2.5">
              <button
                className="btn-primary flex-1 !py-2.5 text-xs font-bold"
                onClick={approve}
                disabled={busy !== null}
              >
                {busy === 'approve' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Authorizing Payment…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Approve Payment</span>
                  </>
                )}
              </button>

              <button
                className="btn-ghost !border-rose-400/50 !bg-rose-50 text-rose-700 dark:!bg-rose-500/10 dark:text-rose-300 px-4 text-xs font-semibold hover:!bg-rose-100 dark:hover:!bg-rose-500/20"
                onClick={reject}
                disabled={busy !== null}
              >
                {busy === 'reject' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </>
                )}
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
