'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { AuditEntry, AuditVerify, PendingApproval, TurnRow } from '@/lib/types';
import { short } from '@/lib/api';
import { TierChip } from './tier';

const STATUS_STYLE: Record<string, string> = {
  executed: 'text-mint',
  pending_approval: 'text-amber',
  blocked: 'text-rose',
  proposed_only: 'text-sky',
  failed: 'text-rose',
  rejected: 'text-ink-400',
  paused: 'text-rose',
  planned: 'text-ink-400',
  decided: 'text-ink-400',
};

export function ActivityFeed({ refreshKey }: { refreshKey: number }) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [verify, setVerify] = useState<AuditVerify | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, v] = await Promise.all([api.audit(60), api.verify()]);
      // Only show state-changing events; "planned"/"decided" are noise for the feed.
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
    <section className="panel flex min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div>
          <h2 className="text-sm font-medium text-ink-100">Activity</h2>
          <p className="text-[10px] text-ink-400">Every decision, hash-chained</p>
        </div>
        {verify && (
          <span
            className={`chip ${
              verify.valid ? 'border-mint/30 bg-mint/10 text-mint' : 'border-rose/30 bg-rose/10 text-rose'
            }`}
            title={verify.valid ? `Chain head ${verify.head}` : `Broken at entry ${verify.brokenAt}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${verify.valid ? 'bg-mint' : 'bg-rose'}`} />
            {verify.valid ? `log intact · ${verify.entries}` : 'log tampered'}
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {error && <p className="px-2 py-4 text-xs text-rose">{error}</p>}
        {!error && entries.length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-ink-400">No activity yet.</p>
        )}
        <ul className="space-y-0.5">
          {entries.map((e) => (
            <li key={`${e.seq}-${e.status}`} className="group rounded-lg px-2 py-2 hover:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 font-mono text-[9px] text-ink-600">#{e.seq}</span>
                {e.decision ? <TierChip tier={e.decision.tier} small /> : <span className="text-[10px] text-ink-400">system</span>}
                <span className={`ml-auto text-[10px] font-medium ${STATUS_STYLE[e.status] ?? 'text-ink-300'}`}>
                  {e.status.replaceAll('_', ' ')}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3 pl-8">
                <span className="truncate text-[11px] text-ink-300">
                  {e.userMessage ? `“${e.userMessage}”` : (e.detail ?? '—')}
                </span>
                <span className="shrink-0 font-mono text-[9px] text-ink-600">
                  {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              {e.proposal && (
                <div className="mt-0.5 pl-8 font-mono text-[10px] text-ink-400">
                  {e.proposal.amount} → {short(e.proposal.to, 5)}
                  {e.txHash && <span className="ml-2 text-ink-600">tx {short(e.txHash, 4)}</span>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
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
    <div className="panel border-amber/20 bg-amber/[0.04] p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-amber">
          {pending.length} payment{pending.length > 1 ? 's' : ''} awaiting your approval
        </span>
        <span className="text-[10px] text-amber/70">shown below</span>
      </div>
      <ul className="mt-2 space-y-1">
        {pending.map((p) => (
          <li key={p.intentId} className="flex items-center justify-between text-[11px] text-ink-200">
            <span>
              {p.amountHuman} {p.tokenSymbol} → {p.contactName ?? short(p.to, 5)}
            </span>
            <button className="text-[10px] text-ink-400 underline underline-offset-2 hover:text-white" onClick={onChanged}>
              review
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function rowsFromResults(rows: TurnRow[]) {
  return rows;
}
