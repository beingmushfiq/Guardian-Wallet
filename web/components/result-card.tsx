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
  const [status, setStatus] = useState<TurnRow['status']>(row.status);
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
      setStatus('executed');
      toast.success('Payment Approved & Sent', `Successfully sent ${row.amountHuman} ${row.tokenSymbol}`);
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
      setStatus('rejected' as TurnRow['status']);
      toast.info('Payment Declined', `Cancelled payment of ${row.amountHuman} ${row.tokenSymbol}`);
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
    status === 'executed'
      ? 'border-emerald-500/50 shadow-[0_0_24px_rgba(16,185,129,0.2)]'
      : status === 'blocked' || status === ('rejected' as string)
      ? 'border-rose-500/40 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
      : row.tier === 'T2'
      ? 'border-emerald-500/35 dark:border-lime-400/30 shadow-[0_0_20px_rgba(16,185,129,0.12)]'
      : row.tier === 'T3'
      ? 'border-amber-500/45 dark:border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
      : 'border-sky-500/35 dark:border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.12)]';

  const riskPct = Math.round((row.riskScore || 0) * 100);

  return (
    <div
      className={`relative w-full min-w-0 overflow-hidden rounded-2xl border bg-white/95 dark:bg-slate-900/90 p-3.5 sm:p-4.5 shadow-sm backdrop-blur-xl transition-all duration-300 ${borderClass}`}
    >
      {/* Top Accent Rim */}
      <div className={`absolute inset-x-0 top-0 h-1.5 ${style.dot} opacity-90`} />

      <div className="space-y-3.5 min-w-0 w-full overflow-hidden">
        {/* Tier Header and Mode */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TierChip tier={row.tier} />
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {row.mode === 'live' ? 'Live Vault' : 'Practice Mode'}
            </span>
            {hash && (
              <span className="chip border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-mono text-[9px] font-bold">
                tx {short(hash, 4)}
              </span>
            )}
          </div>
        </div>

        {/* Amount & Destination */}
        <div className="flex flex-wrap items-end justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/80 dark:border-white/[0.06] dark:bg-slate-950/60 p-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {row.amountHuman}
              </span>
              <span className="text-sm font-bold text-emerald-600 dark:text-lime-400">{row.tokenSymbol}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 min-w-0">
              <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {row.contactName ? `To ${row.contactName}` : 'To new recipient'}
              </span>
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">({short(row.to, 5)})</span>
            </div>
          </div>

          {/* Safety Evaluation Score */}
          {row.riskScore > 0 && (
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400">
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
        <div className="rounded-xl border border-slate-200/80 bg-slate-100/70 dark:border-white/[0.06] dark:bg-black/35 p-3 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            Security Rule Check
          </div>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100 break-words">
            {row.reasons[0]}
          </p>
          {row.reasons.length > 1 && (
            <ul className="mt-2 space-y-1 border-t border-slate-200/60 dark:border-white/[0.04] pt-2">
              {row.reasons.slice(1).map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 break-words">
                  <span className="text-emerald-600 dark:text-lime-400 font-bold shrink-0">›</span>
                  <span className="break-words">{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Security Tags */}
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {row.flags.map((f) => (
            <span
              key={f}
              className="chip border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02] font-mono text-[10px] text-slate-700 dark:text-slate-300"
            >
              {f.toLowerCase().replaceAll('_', ' ')}
            </span>
          ))}
        </div>

        {/* User Request Reason */}
        {row.reason && (
          <p className="border-l-2 border-slate-300 dark:border-white/20 pl-2.5 text-xs italic leading-relaxed text-slate-600 dark:text-slate-400 break-words">
            “{row.reason}”
          </p>
        )}

        {/* Explicit Status Banners & Actions */}
        {status === 'executed' ? (
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-3 text-emerald-800 dark:text-emerald-300 shadow-sm animate-rise min-w-0 w-full overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-slate-950 font-bold">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-extrabold uppercase tracking-wide break-words">
                  Payment Paid & Settled On-Chain
                </div>
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium break-words">
                  {row.amountHuman} {row.tokenSymbol} sent successfully from vault
                </div>
              </div>
            </div>
            {hash && (
              <span className="chip shrink-0 border-emerald-500/40 bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-200">
                tx {short(hash, 4)}
              </span>
            )}
          </div>
        ) : status === ('rejected' as string) ? (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-rose-800 dark:text-rose-300 shadow-sm animate-rise min-w-0 w-full overflow-hidden">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white font-bold">
              <X className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase tracking-wide break-words">
                Payment Declined & Cancelled
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium break-words">
                No funds were sent. Your vault balance is untouched.
              </div>
            </div>
          </div>
        ) : status === 'blocked' ? (
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/15 p-3 text-rose-800 dark:text-rose-300 shadow-sm min-w-0 w-full overflow-hidden">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold">
              <X className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase tracking-wide break-words">
                Payment Blocked by Policy
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-medium break-words">
                Violates strict spending rules. Assistant cannot override.
              </div>
            </div>
          </div>
        ) : status === 'pending' ? (
          <div className="pt-1 space-y-2 min-w-0 w-full">
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 break-words min-w-0 w-full">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="break-words min-w-0 flex-1">Owner Confirmation Required — Authorize with your wallet below</span>
            </div>

            <div className="flex flex-wrap gap-2.5 min-w-0 w-full">
              <button
                className="btn-primary flex-1 min-w-[130px] !py-2.5 text-xs font-bold"
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
            {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium break-words">{error}</p>}
          </div>
        ) : null}
      </div>
    </div>
  );
}
