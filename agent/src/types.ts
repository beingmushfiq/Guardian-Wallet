export type Address = `0x${string}`;

export type Source = 'user' | 'untrusted';

export interface Proposal {
  intentId: `0x${string}`;
  kind: 'transfer';
  token: Address;
  to: Address;
  amount: bigint; // token base units
  reason: string;
  tainted: boolean; // true if untrusted text was in the turn
  injectionHits: string[];
}

export type Tier = 'T1' | 'T2' | 'T3' | 'BLOCK';

export interface Decision {
  tier: Tier;
  reasons: string[];
  flags: string[];
  riskScore: number;
}

export interface PolicyContext {
  vaultPaused: boolean;
  tokenAllowlist: Set<string>;
  recipientAllowlist: Set<string>;
  perTxCap: bigint;
  dailyCap: bigint;
  spentToday: bigint;
  recentAmounts: bigint[];
  recentBlocksInWindow: number;
  safetyModeUntil: number; // epoch ms, 0 if off
  now: number;
}

export interface RiskResult {
  score: number;
  flags: string[];
  notes: string[];
}

export interface Contact {
  name: string;
  address: Address;
  allowlisted: boolean;
}

export interface TokenInfo {
  symbol: string;
  address: Address;
  decimals: number;
}

export interface VenueState {
  paused: boolean;
  balance: bigint;
  spentToday: bigint;
  perTxCap: bigint;
  dailyCap: bigint;
  recipientAllowlist: Set<string>;
  tokenAllowlist: Set<string>;
}

export interface SimulationResult {
  ok: boolean;
  error?: string;
}

export interface ExecutionResult {
  hash: `0x${string}`;
  mode: 'live' | 'simulated';
  simulated?: boolean;
}

/**
 * The venue is the trust anchor. One implementation talks to GuardianVault on-chain,
 * the other is a local simulator that applies the exact same rules for offline demos.
 */
export interface Venue {
  readonly mode: 'live' | 'simulated';
  readState(): Promise<VenueState>;
  isContract(address: Address): Promise<boolean>;
  simulate(proposal: Proposal): Promise<SimulationResult>;
  transfer(proposal: Proposal): Promise<ExecutionResult>;
  pause(): Promise<ExecutionResult>;
  ownerTransferCall(proposal: Proposal): {
    to: Address;
    data: `0x${string}`;
    value: '0';
    chainId: number;
  };
  /** Live mode only: verify the owner-signed tx before recording it. */
  verifyOwnerTransfer(intentId: `0x${string}`, txHash: `0x${string}`): Promise<{ ok: boolean; error?: string }>;
  /** Simulated mode only: apply the owner transfer locally (no key involved). */
  simulatedOwnerTransfer(proposal: Proposal): Promise<ExecutionResult>;
}

export interface AuditEntry {
  seq: number;
  ts: string;
  intentId?: string;
  userMessage?: string;
  proposal?: {
    token: string;
    to: string;
    amount: string;
  };
  decision?: Decision;
  status: string;
  txHash?: string;
  mode?: 'live' | 'simulated';
  detail?: string;
  prevHash: string;
  hash: string;
}

export interface PlannedTurn {
  assistantText: string;
  proposals: Proposal[];
  planner: 'llm' | 'fallback';
}

export interface TurnResult {
  assistantText: string;
  planner: 'llm' | 'fallback';
  results: Array<{
    intentId: string;
    to: string;
    amount: string;
    amountHuman: string;
    token: string;
    tokenSymbol: string;
    tier: Tier;
    reasons: string[];
    flags: string[];
    riskScore: number;
    status: 'executed' | 'pending' | 'proposed' | 'blocked' | 'failed';
    txHash?: string;
    mode: 'live' | 'simulated';
    reason: string;
    contactName?: string;
  }>;
}
