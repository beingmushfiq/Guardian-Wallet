import { config, explorerTx } from './config.js';
import { assessRisk } from './risk.js';
import { decide } from './policy.js';
import { formatUnits, plan } from './planner.js';
import { appendAudit } from './audit.js';
import {
  addPending,
  blocksInWindow,
  clearBlocks,
  getMeta,
  getPending,
  listPending,
  recordBlock,
  recordTransfer,
  recentAmounts,
  setMeta,
  setPendingStatus,
  getCustomContacts,
} from './store.js';
import type { Address, PolicyContext, Proposal, Tier, TurnResult, Venue } from './types.js';

const SAFETY_KEY = 'safety_mode_until';

export function safetyModeUntil(): number {
  return Number(getMeta(SAFETY_KEY) ?? 0);
}

export function setSafetyMode(ms: number): void {
  setMeta(SAFETY_KEY, String(ms));
}

const getAllContacts = () => [...config.contacts, ...getCustomContacts()];

export interface TurnContext {
  venue: Venue;
  userMessage: string;
  untrustedAttachment?: string;
}

type ResultRow = TurnResult['results'][number];

export async function runTurn(ctx: TurnContext): Promise<TurnResult> {
  const { venue, userMessage, untrustedAttachment } = ctx;
  const state = await venue.readState();
  const recent = recentAmounts(10);

  const planned = await plan({
    userMessage,
    untrustedAttachment,
    contacts: getAllContacts(),
    balanceHuman: formatUnits(state.balance),
    perTxCapHuman: formatUnits(state.perTxCap),
    dailyCapHuman: formatUnits(state.dailyCap),
    spentTodayHuman: formatUnits(state.spentToday),
    paused: state.paused,
  });

  appendAudit({
    userMessage,
    attachment: untrustedAttachment ? untrustedAttachment.slice(0, 2000) : undefined,
    status: 'planned',
    mode: venue.mode,
    detail: `${planned.proposals.length} proposal(s) via ${planned.planner} planner`,
  });

  const results: ResultRow[] = [];
  for (const p of planned.proposals) {
    results.push(await processProposal(venue, p, userMessage, recent));
  }

  return {
    assistantText:
      planned.assistantText ||
      (planned.proposals.length === 0
        ? 'I did not create a proposal. Tell me who to pay and how much.'
        : 'Proposal passed to the policy engine.'),
    planner: planned.planner,
    results,
  };
}

async function processProposal(
  venue: Venue,
  p: Proposal,
  userMessage: string,
  recent: bigint[],
): Promise<ResultRow> {
  const fresh = await venue.readState();
  const policyCtx: PolicyContext = {
    vaultPaused: fresh.paused,
    tokenAllowlist: fresh.tokenAllowlist,
    recipientAllowlist: fresh.recipientAllowlist,
    perTxCap: fresh.perTxCap,
    dailyCap: fresh.dailyCap,
    spentToday: fresh.spentToday,
    recentAmounts: recent,
    recentBlocksInWindow: blocksInWindow(config.safety.blocksWindowMs),
    safetyModeUntil: safetyModeUntil(),
    now: Date.now(),
  };

  // The contract simulation is authoritative for both the agent path and "would this
  // revert". Two classes of revert are NOT final denials, because the owner can still
  // authorise a direct ownerTransfer: a non-allowlisted recipient, and amounts above
  // the agent caps. Everything else (paused vault, bad token, insufficient balance)
  // is a hard block.
  const simulation = await venue.simulate(p);
  const ownerCanResolve = /NotAllowed: recipient|OverPerTxCap|OverDailyCap/.test(simulation.error ?? '');
  const simulationBlocking = !simulation.ok && !ownerCanResolve;
  const recipientIsContract = await venue.isContract(p.to).catch(() => false);
  const risk = assessRisk(p, policyCtx, { recipientIsContract, simulationOk: !simulationBlocking });
  const decision = decide(p, policyCtx, risk);

  const amountHuman = formatUnits(p.amount);
  const contact = getAllContacts().find((c) => c.address.toLowerCase() === p.to.toLowerCase());
  const auditBase = {
    intentId: p.intentId,
    userMessage,
    proposal: { token: p.token, to: p.to, amount: p.amount.toString() },
    decision,
    mode: venue.mode,
  };

  appendAudit({
    ...auditBase,
    status: 'decided',
    detail: simulation.ok ? undefined : `simulation: ${simulation.error}`,
  });

  let status: ResultRow['status'];
  let txHash: string | undefined;

  if (decision.tier === 'T2') {
    try {
      const exec = await venue.transfer(p);
      txHash = exec.hash;
      status = 'executed';
      recordTransfer(p, exec.hash);
      appendAudit({
        ...auditBase,
        status: 'executed',
        txHash: exec.hash,
        mode: exec.mode,
        detail: exec.mode === 'simulated' ? 'Simulated transfer (no chain configured)' : undefined,
      });
    } catch (e: unknown) {
      status = 'failed';
      appendAudit({ ...auditBase, status: 'failed', detail: e instanceof Error ? e.message : String(e) });
    }
  } else if (decision.tier === 'T3') {
    addPending(p, userMessage);
    status = 'pending';
    appendAudit({ ...auditBase, status: 'pending_approval' });
  } else if (decision.tier === 'T1') {
    status = 'proposed';
    appendAudit({ ...auditBase, status: 'proposed_only' });
  } else {
    status = 'blocked';
    recordBlock(decision.reasons[0] ?? 'blocked');
    maybeEnableSafetyMode();
    appendAudit({ ...auditBase, status: 'blocked' });
  }

  return {
    intentId: p.intentId,
    to: p.to,
    amount: p.amount.toString(),
    amountHuman,
    token: p.token,
    tokenSymbol: config.token.symbol,
    tier: decision.tier,
    reasons: decision.reasons,
    flags: decision.flags,
    riskScore: decision.riskScore,
    status,
    txHash,
    mode: venue.mode,
    reason: p.reason,
    contactName: contact?.name,
  };
}

function maybeEnableSafetyMode(): void {
  const recentBlocks = blocksInWindow(config.safety.blocksWindowMs);
  if (recentBlocks >= config.safety.blocksForSafetyMode) {
    setSafetyMode(Date.now() + config.safety.safetyModeDurationMs);
  }
}

export function pendingApprovals() {
  return listPending().map((p) => ({
    intentId: p.intentId,
    createdAt: p.createdAt,
    userMessage: p.userMessage,
    to: p.proposal.to,
    token: p.proposal.token,
    tokenSymbol: config.token.symbol,
    amount: p.proposal.amount.toString(),
    amountHuman: formatUnits(p.proposal.amount),
    reason: p.proposal.reason,
    contactName: getAllContacts().find((c) => c.address.toLowerCase() === p.proposal.to.toLowerCase())?.name,
  }));
}

export interface ApprovalPayload {
  intentId: string;
  call: { to: Address; data: `0x${string}`; value: '0'; chainId: number };
  amountHuman: string;
  tokenSymbol: string;
  to: string;
  mode: 'live' | 'simulated';
}

export function approvalPayload(venue: Venue, intentId: string): ApprovalPayload {
  const row = getPending(intentId);
  if (!row) throw new Error('Unknown intentId');
  if (row.status !== 'pending') throw new Error(`Intent is already ${row.status}`);
  const call = venue.ownerTransferCall(row.proposal);
  return {
    intentId,
    call,
    amountHuman: formatUnits(row.proposal.amount),
    tokenSymbol: config.token.symbol,
    to: row.proposal.to,
    mode: venue.mode,
  };
}

export async function approvePending(
  venue: Venue,
  intentId: string,
  txHash?: string,
): Promise<{ ok: true; txHash: string; mode: 'live' | 'simulated'; explorerUrl?: string }> {
  const row = getPending(intentId);
  if (!row) throw new Error('Unknown intentId');
  if (row.status !== 'pending') throw new Error(`Intent is already ${row.status}`);
  const intent = row.proposal.intentId;
  const proposal = { token: row.proposal.token, to: row.proposal.to, amount: row.proposal.amount.toString() };

  if (venue.mode === 'live') {
    if (!txHash) throw new Error('txHash is required in live mode');
    const check = await venue.verifyOwnerTransfer(intent, txHash as `0x${string}`);
    if (!check.ok) throw new Error(`Owner transfer not verified: ${check.error}`);
    setPendingStatus(intentId, 'approved');
    recordTransfer(row.proposal, txHash);
    appendAudit({
      intentId,
      proposal,
      decision: { tier: 'T3', reasons: ['Approved by owner wallet'], flags: [], riskScore: 0 },
      status: 'executed',
      txHash,
      mode: 'live',
      detail: 'Owner-signed ownerTransfer verified on-chain',
    });
    return { ok: true, txHash, mode: 'live', explorerUrl: explorerTx(txHash) };
  }

  const exec = await venue.simulatedOwnerTransfer(row.proposal);
  setPendingStatus(intentId, 'approved');
  recordTransfer(row.proposal, exec.hash);
  appendAudit({
    intentId,
    proposal,
    decision: { tier: 'T3', reasons: ['Approved via simulated owner path'], flags: [], riskScore: 0 },
    status: 'executed',
    txHash: exec.hash,
    mode: 'simulated',
    detail: 'Simulated ownerTransfer (no chain configured)',
  });
  return { ok: true, txHash: exec.hash, mode: 'simulated' };
}

export function rejectPending(intentId: string): void {
  const row = getPending(intentId);
  if (!row) throw new Error('Unknown intentId');
  if (row.status !== 'pending') throw new Error(`Intent is already ${row.status}`);
  setPendingStatus(intentId, 'rejected');
  appendAudit({
    intentId,
    proposal: { token: row.proposal.token, to: row.proposal.to, amount: row.proposal.amount.toString() },
    decision: { tier: 'T3', reasons: ['Rejected by user'], flags: [], riskScore: 0 },
    status: 'rejected',
    mode: 'simulated',
  });
}

export async function pauseVault(
  venue: Venue,
  reason = 'Kill switch pressed by user',
): Promise<{ txHash: string; mode: string }> {
  const exec = await venue.pause();
  clearBlocks();
  setSafetyMode(0);
  appendAudit({ status: 'paused', mode: exec.mode, txHash: exec.hash, detail: reason });
  return { txHash: exec.hash, mode: exec.mode };
}

export function resetDemoState(): void {
  clearBlocks();
  setSafetyMode(0);
}

export function describeTier(tier: Tier): string {
  return { T1: 'Propose only', T2: 'Auto-execute', T3: 'Owner approval', BLOCK: 'Blocked' }[tier];
}
