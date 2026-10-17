import type { Address, PolicyContext, Proposal, RiskResult } from './types.js';

const norm = (a: string) => a.toLowerCase();

export function isLookalike(candidate: Address, saved: Address[]): Address | null {
  const c = norm(candidate).slice(2);
  for (const s of saved) {
    const sv = norm(s).slice(2);
    if (c === sv) continue;
    if (c.slice(0, 4) === sv.slice(0, 4) && c.slice(-4) === sv.slice(-4)) return s;
  }
  return null;
}

export function median(xs: bigint[]): bigint {
  if (!xs.length) return 0n;
  const s = [...xs].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return s[Math.floor(s.length / 2)];
}

export function assessRisk(
  p: Proposal,
  ctx: PolicyContext,
  opts: { recipientIsContract: boolean; simulationOk: boolean },
): RiskResult {
  let score = 0;
  const flags: string[] = [];
  const notes: string[] = [];
  const add = (w: number, flag: string, note: string) => {
    score += w;
    flags.push(flag);
    notes.push(note);
  };

  if (!ctx.tokenAllowlist.has(norm(p.token))) add(1.0, 'UNKNOWN_TOKEN', 'Token is not on the approved list');

  const saved = [...ctx.recipientAllowlist] as Address[];
  const look = isLookalike(p.to, saved);
  if (look) add(1.0, 'LOOKALIKE_ADDRESS', `Resembles saved contact ${look}`);

  if (!ctx.recipientAllowlist.has(norm(p.to))) add(0.2, 'NEW_RECIPIENT', 'Recipient is not saved');

  if (opts.recipientIsContract) add(0.35, 'RECIPIENT_IS_CONTRACT', 'Recipient is a smart contract');

  const med = median(ctx.recentAmounts);
  if (med > 0n && p.amount > med * 5n) add(0.3, 'AMOUNT_ANOMALY', 'Amount is more than 5x your typical transfer');

  if (p.injectionHits.length) {
    add(0.5, 'INJECTION_SUSPECTED', `Untrusted text matched: ${p.injectionHits.join(', ')}`);
  }

  if (!opts.simulationOk) add(1.0, 'SIM_FAIL', 'Simulation indicates the transaction would fail');

  return { score: Math.min(1, score), flags, notes };
}
