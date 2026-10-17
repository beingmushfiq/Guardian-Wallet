'use client';

import { useState } from 'react';
import { api, short } from '@/lib/api';
import type { AgentState } from '@/lib/types';
import { OwnerNotice } from './wallet';

function Meter({ used, cap, label }: { used: string; cap: string; label: string }) {
  const u = Number(used);
  const c = Number(cap) || 1;
  const pct = Math.min(100, Math.round((u / c) * 100));
  const color = pct > 85 ? 'bg-rose' : pct > 60 ? 'bg-amber' : 'bg-lime-400';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="label">{label}</span>
        <span className="font-mono text-[11px] text-ink-300">
          {used} <span className="text-ink-400">/ {cap}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function PolicyPanel({
  state,
  refresh,
  onPaused,
}: {
  state: AgentState | null;
  refresh: () => void;
  onPaused: () => void;
}) {
  const [pausing, setPausing] = useState(false);
  const [error, setError] = useState('');

  async function pause() {
    if (!confirm('Pause the vault? The agent will be unable to move any funds until you unpause it from your wallet.'))
      return;
    setPausing(true);
    setError('');
    try {
      await api.pause();
      refresh();
      onPaused();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPausing(false);
    }
  }

  const safetyActive = Boolean(state && state.safetyModeUntil > Date.now());

  return (
    <aside className="panel flex flex-col gap-5 p-5">
      <div>
        <div className="flex items-start justify-between">
          <span className="label">Vault</span>
          <span
            className={`chip ${
              state?.mode === 'live'
                ? 'border-mint/30 bg-mint/10 text-mint'
                : 'border-sky/30 bg-sky/10 text-sky'
            }`}
          >
            {state?.mode === 'live' ? 'LIVE · BASE SEPOLIA' : 'SIMULATED LEDGER'}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-3xl tracking-tight text-white">
            {state?.balance ?? '—'}
          </span>
          <span className="text-sm text-ink-400">{state?.token.symbol ?? 'USDC'}</span>
        </div>
        <div className="mt-1 text-[11px] text-ink-400">
          {state?.mode === 'live' && state.vault ? (
            <a
              href={state.explorerVault ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="font-mono underline decoration-white/20 underline-offset-4 hover:text-ink-200"
            >
              {short(state.vault, 6)}
            </a>
          ) : (
            <span>Offline demo ledger · same rules as the contract</span>
          )}
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {state?.paused ? (
        <div className="rounded-xl border border-rose/30 bg-rose/10 p-3">
          <div className="text-sm font-medium text-rose">Vault paused</div>
          <p className="mt-1 text-[11px] leading-relaxed text-rose/80">
            All transfers are blocked. Only the owner wallet can unpause.
          </p>
        </div>
      ) : (
        <button className="btn-danger w-full" onClick={pause} disabled={pausing}>
          {pausing ? 'Pausing…' : 'Pause everything'}
        </button>
      )}
      {error && <p className="text-[11px] text-rose">{error}</p>}

      {safetyActive && (
        <div className="rounded-xl border border-amber/30 bg-amber/10 p-3">
          <div className="text-xs font-medium text-amber">Safety mode active</div>
          <p className="mt-1 text-[11px] leading-relaxed text-amber/80">
            Several payments were blocked recently. Every new payment will require your review.
          </p>
        </div>
      )}

      <div className="space-y-4">
        <Meter used={state?.spentToday ?? '0'} cap={state?.dailyCap ?? '0'} label="Daily auto-approval" />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-400">Per-transaction cap</span>
          <span className="font-mono text-ink-200">
            {state?.perTxCap ?? '—'} {state?.token.symbol}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-400">Planner</span>
          <span className="font-mono text-ink-200">{state?.planner === 'llm' ? 'Claude' : 'Deterministic'}</span>
        </div>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div>
        <span className="label">Approved recipients</span>
        <ul className="mt-2 space-y-2">
          {(state?.contacts ?? []).map((c) => {
            const allowed = state?.recipientAllowlist?.includes(c.address.toLowerCase());
            return (
              <li key={c.address} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] text-ink-100">{c.name}</div>
                  <div className="font-mono text-[10px] text-ink-400">{short(c.address, 5)}</div>
                </div>
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${allowed ? 'bg-mint' : 'bg-ink-600'}`}
                  title={allowed ? 'Allowlisted on-chain' : 'Not allowlisted'}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="h-px bg-white/[0.06]" />

      <div className="space-y-2">
        <span className="label">Power boundary</span>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink-300">
          <li className="flex gap-2">
            <span className="text-mint">✓</span> Spend within caps, to allowlisted recipients
          </li>
          <li className="flex gap-2">
            <span className="text-mint">✓</span> Pause the vault in an emergency
          </li>
          <li className="flex gap-2">
            <span className="text-rose">✕</span> Change recipients, caps, or unpause
          </li>
          <li className="flex gap-2">
            <span className="text-rose">✕</span> Transfer to unknown addresses on its own
          </li>
        </ul>
      </div>

      {state && <OwnerNotice owner={state.owner} />}
    </aside>
  );
}
