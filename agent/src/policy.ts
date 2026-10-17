import type { Decision, PolicyContext, Proposal } from './types.js';
import type { RiskResult } from './types.js';

const norm = (a: string) => a.toLowerCase();

/**
 * Deterministic policy engine. Takes only typed fields — never natural language.
 * Rows are evaluated top-to-bottom and the first match wins (see docs §7.2).
 */
export function decide(p: Proposal, ctx: PolicyContext, risk: RiskResult): Decision {
  const out = (tier: Decision['tier'], reason: string, extra: string[] = []): Decision => ({
    tier,
    reasons: [reason, ...extra],
    flags: risk.flags,
    riskScore: risk.score,
  });

  if (ctx.vaultPaused) return out('BLOCK', 'Wallet is paused by the owner or the safety system.');
  if (!ctx.tokenAllowlist.has(norm(p.token))) return out('BLOCK', 'Token is not on the approved list.');
  if (risk.flags.includes('LOOKALIKE_ADDRESS')) {
    return out('BLOCK', 'Address resembles a saved contact but is different. Possible address poisoning.');
  }
  if (risk.score >= 0.7) return out('BLOCK', `Risk score too high: ${risk.flags.join(', ')}.`);
  if (risk.flags.includes('SIM_FAIL')) return out('BLOCK', 'Simulation shows this transaction would fail.');
  if (p.tainted && p.injectionHits.length) {
    return out('T1', 'Instructions came from an untrusted document. Review manually.');
  }
  if (ctx.safetyModeUntil > ctx.now) return out('T1', 'Safety mode: several blocked attempts recently.');
  if (!ctx.recipientAllowlist.has(norm(p.to))) return out('T3', 'New recipient. Your approval is required.');
  if (p.amount > ctx.perTxCap) return out('T3', 'Amount exceeds the auto-approval limit.');
  if (ctx.spentToday + p.amount > ctx.dailyCap) {
    return out('T3', 'Daily auto-approval budget would be exceeded.');
  }
  if (risk.score >= 0.4) {
    return out('T3', `Moderate risk: ${risk.flags.join(', ')}. Approval required.`);
  }

  return out('T2', 'Within your limits to a trusted recipient. Executed automatically.');
}

/** Human-readable explanation of the risk score, used by the UI. */
export function summarizeRisk(risk: RiskResult): string {
  if (!risk.flags.length) return 'No risk flags.';
  return risk.notes.join('; ');
}
