'use client';

import { useState } from 'react';
import { api, short } from '@/lib/api';
import type { TurnRow } from '@/lib/types';
import { TierChip, tierStyle } from './tier';
import { useOwnerSigner } from './wallet';

export function ResultCard({ row, onDone }: { row: TurnRow; onDone: () => void }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState('');
  const [hash, setHash] = useState(row.txHash);
  const signOwner = useOwnerSigner();
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
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy('reject');
    setError('');
    try {
      await api.reject(row.intentId);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={`animate-rise overflow-hidden rounded-2xl border ${style.className.replace('text-', 'border-').split(' ')[0]} bg-ink-800/70`}>
      <div className={`h-0.5 w-full ${style.dot}`} />
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <TierChip tier={row.tier} />
          <span className="font-mono text-[10px] text-ink-400">{row.mode === 'live' ? 'on-chain' : 'simulated'}</span>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl tracking-tight text-white">{row.amountHuman}</span>
            <span className="text-xs text-ink-400">{row.tokenSymbol}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-300">
            <span>to {row.contactName ?? 'new address'}</span>
            <span className="font-mono text-ink-400">{short(row.to, 6)}</span>
          </div>
        </div>

        <div className="rounded-xl bg-black/25 p-2.5">
          <p className="text-[11px] leading-relaxed text-ink-200">{row.reasons[0]}</p>
          {row.reasons.length > 1 && (
            <ul className="mt-1 space-y-0.5">
              {row.reasons.slice(1).map((r) => (
                <li key={r} className="text-[11px] leading-relaxed text-ink-400">
                  · {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {row.flags.map((f) => (
            <span key={f} className="chip border-white/10 bg-white/[0.03] font-mono text-ink-300">
              {f.toLowerCase().replaceAll('_', ' ')}
            </span>
          ))}
          {row.riskScore > 0 && (
            <span className="chip border-white/10 bg-white/[0.03] text-ink-400">
              risk {(row.riskScore * 100).toFixed(0)}
            </span>
          )}
        </div>

        <p className="text-[11px] italic leading-relaxed text-ink-400">“{row.reason}”</p>

        {row.status === 'pending' && (
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1 !py-2 text-xs" onClick={approve} disabled={busy !== null}>
              {busy === 'approve'
                ? row.mode === 'live'
                  ? 'Confirm in wallet…'
                  : 'Approving…'
                : row.mode === 'live'
                  ? 'Approve in wallet'
                  : 'Approve'}
            </button>
            <button className="btn-ghost flex-1 !py-2 text-xs" onClick={reject} disabled={busy !== null}>
              {busy === 'reject' ? 'Rejecting…' : 'Reject'}
            </button>
          </div>
        )}

        {row.status === 'executed' && (
          <div className="flex items-center gap-2 rounded-xl border border-mint/20 bg-mint/[0.06] px-2.5 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <span className="text-[11px] text-mint">Executed</span>
            <span className="ml-auto font-mono text-[10px] text-ink-300">{short(hash, 6)}</span>
          </div>
        )}

        {(row.status === 'blocked' || row.status === 'proposed' || row.status === 'failed') && (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-2.5 py-2">
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            <span className="text-[11px] text-ink-200">
              {row.status === 'blocked' ? 'Nothing was sent.' : row.status === 'proposed' ? 'Waiting for you.' : 'Execution failed.'}
            </span>
          </div>
        )}

        {error && <p className="text-[11px] leading-relaxed text-rose">{error}</p>}
      </div>
    </div>
  );
}
