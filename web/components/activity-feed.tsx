'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, short } from '@/lib/api';
import type { AuditEntry, AuditVerify, PendingApproval } from '@/lib/types';
import { TierChip } from './tier';
import { SpatialCard } from '@/components/spatial-card';
import {
  Activity,
  Layers,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  executed:
    'text-emerald-800 bg-emerald-50 border-emerald-500/30 dark:text-lime-300 dark:border-lime-400/30 dark:bg-lime-400/10',
  pending_approval:
    'text-amber-900 bg-amber-50 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30 dark:bg-amber-400/10',
  blocked:
    'text-rose-800 bg-rose-50 border-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10',
  proposed_only:
    'text-sky-800 bg-sky-50 border-sky-500/30 dark:text-sky-300 dark:border-sky-400/30 dark:bg-sky-400/10',
  failed:
    'text-rose-800 bg-rose-50 border-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10',
  rejected:
    'text-slate-700 bg-slate-100 border-slate-300 dark:text-ink-400 dark:border-white/10 dark:bg-white/[0.02]',
  paused:
    'text-rose-800 bg-rose-50 border-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 dark:bg-rose-500/10',
  planned:
    'text-slate-700 bg-slate-100 border-slate-300 dark:text-ink-400 dark:border-white/10 dark:bg-white/[0.02]',
  decided:
    'text-slate-700 bg-slate-100 border-slate-300 dark:text-ink-400 dark:border-white/10 dark:bg-white/[0.02]',
};

export function ActivityFeed({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [verify, setVerify] = useState<AuditVerify | null>(null);
  const [error, setError] = useState('');
  const [expandedSeq, setExpandedSeq] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, v] = await Promise.all([api.audit(60), api.verify()]);
      setEntries(a.entries.filter((e) => !['planned', 'decided'].includes(e.status)));
      setVerify(v);
      setError('');
    } catch {
      setError('Agent offline');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load, refreshKey]);

  return (
    <SpatialCard className="flex flex-col min-h-0 flex-1 p-5">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.06] pb-3.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-ink-100">
              Verified Activity Log
            </h2>
            <p className="text-[10px] text-slate-600 dark:text-ink-400">
              Permanent, tamper-proof payment record
            </p>
          </div>
        </div>

        {verify && (
          <span
            className={`chip font-mono text-[9px] font-bold ${
              verify.valid
                ? 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'
            }`}
            title={verify.valid ? `Verified head ${verify.head}` : `Broken at entry ${verify.brokenAt}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                verify.valid ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-rose-500'
              }`}
            />
            {verify.valid ? `100% VERIFIED · ${verify.entries} RECORDS` : 'VERIFICATION ALERT'}
          </span>
        )}
      </header>

      {/* Audit Blocks List */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-auto pt-3 space-y-1.5 pr-1 w-full min-w-0">
        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}

        {!error && entries.length === 0 && (
          <div className="py-8 text-center">
            <Layers className="mx-auto h-6 w-6 text-slate-400 dark:text-ink-600" />
            <p className="mt-2 text-xs text-slate-500 dark:text-ink-400">No payment records yet.</p>
          </div>
        )}

        {entries.map((e) => {
          const isExpanded = expandedSeq === e.seq;
          return (
            <div
              key={`${e.seq}-${e.status}`}
              onClick={() => setExpandedSeq(isExpanded ? null : e.seq)}
              className="group cursor-pointer rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition-all hover:border-slate-300 hover:bg-slate-100/80 dark:border-white/[0.04] dark:bg-ink-900/40 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.03]"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-ink-400 group-hover:text-emerald-600 dark:group-hover:text-lime-300">
                    #{String(e.seq).padStart(2, '0')}
                  </span>
                  {e.decision ? (
                    <TierChip tier={e.decision.tier} small />
                  ) : (
                    <span className="chip border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02] text-[9px] text-slate-600 dark:text-ink-400 font-mono">
                      SYSTEM
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`chip font-mono text-[9px] font-bold uppercase ${
                      STATUS_STYLE[e.status] ?? 'text-slate-600 dark:text-ink-300'
                    }`}
                  >
                    {e.status.replaceAll('_', ' ')}
                  </span>
                  <span className="font-mono text-[9px] text-slate-500 dark:text-ink-500">
                    {new Date(e.ts).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs text-slate-800 dark:text-ink-200">
                <span className="truncate font-semibold">
                  {e.userMessage ? `“${e.userMessage}”` : e.detail ?? '—'}
                </span>
                {e.proposal && (
                  <span className="shrink-0 font-mono text-[10px] text-emerald-700 dark:text-lime-400 font-bold">
                    {e.proposal.amount} → {short(e.proposal.to, 4)}
                  </span>
                )}
              </div>

              {/* Cryptographic hash chain dropdown */}
              {isExpanded && (
                <div className="mt-2.5 rounded-lg border border-slate-200 bg-white p-2 font-mono text-[10px] text-slate-600 dark:border-white/[0.06] dark:bg-black/40 dark:text-ink-400 space-y-1">
                  <div className="truncate">
                    <span className="text-slate-400 dark:text-ink-600">Previous record:</span> {e.prevHash}
                  </div>
                  <div className="truncate">
                    <span className="text-emerald-600 dark:text-lime-400/90 font-bold">Fingerprint:</span> {e.hash}
                  </div>
                  {e.txHash && (
                    <div className="truncate text-slate-700 dark:text-ink-300">
                      <span className="text-sky-600 dark:text-sky-400 font-bold">Tx ID:</span> {e.txHash}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SpatialCard>
  );
}

export function PendingStrip({
  pending,
  onChanged,
}: {
  pending: PendingApproval[];
  onChanged: () => void;
}) {
  if (!pending.length) return null;

  return (
    <div className="mb-3 overflow-hidden rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-3 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-bounce" />
          <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
            {pending.length} Payment{pending.length > 1 ? 's' : ''} Awaiting Your Personal Approval
          </span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-amber-800 dark:text-amber-300/90">
          Owner approval needed
        </span>
      </div>

      <ul className="mt-2.5 space-y-1.5">
        {pending.map((p) => (
          <li
            key={p.intentId}
            className="flex items-center justify-between rounded-lg border border-slate-200/80 bg-white/90 dark:border-white/[0.04] dark:bg-black/30 px-3 py-2 text-xs text-slate-800 dark:text-ink-200"
          >
            <span className="font-medium">
              <span className="font-bold text-slate-900 dark:text-white">{p.amountHuman}</span>{' '}
              <span className="text-emerald-700 dark:text-lime-400 font-bold">{p.tokenSymbol}</span> →{' '}
              <span className="text-slate-700 dark:text-ink-300">{p.contactName ?? short(p.to, 5)}</span>
            </span>
            <button
              className="btn-ghost !py-1 !px-2.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:text-black dark:hover:text-white"
              onClick={onChanged}
            >
              Review Now
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
