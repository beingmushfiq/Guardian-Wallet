export type Tier = 'T1' | 'T2' | 'T3' | 'BLOCK';

export interface TurnRow {
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
}

export interface TurnResponse {
  assistantText: string;
  planner: 'llm' | 'fallback';
  results: TurnRow[];
}

export interface AgentState {
  mode: 'live' | 'simulated';
  planner: 'llm' | 'fallback';
  chainId: number;
  explorer: string;
  vault: string | null;
  owner: string;
  token: { symbol: string; address: string; decimals: number };
  balance: string;
  spentToday: string;
  perTxCap: string;
  dailyCap: string;
  paused: boolean;
  safetyModeUntil: number;
  contacts: Array<{ name: string; address: string; allowlisted: boolean }>;
  recipientAllowlist: string[];
  tokenAllowlist: string[];
  explorerVault: string | null;
  live: boolean;
}

export interface PendingApproval {
  intentId: string;
  createdAt: number;
  userMessage: string;
  to: string;
  token: string;
  tokenSymbol: string;
  amount: string;
  amountHuman: string;
  reason: string;
  contactName?: string;
}

export interface ApprovalPayload {
  intentId: string;
  call: { to: `0x${string}`; data: `0x${string}`; value: '0'; chainId: number };
  amountHuman: string;
  tokenSymbol: string;
  to: string;
  mode: 'live' | 'simulated';
}

export interface AuditEntry {
  seq: number;
  ts: string;
  intentId?: string;
  userMessage?: string;
  proposal?: { token: string; to: string; amount: string };
  decision?: { tier: Tier; reasons: string[]; flags: string[]; riskScore: number };
  status: string;
  txHash?: string;
  mode?: 'live' | 'simulated';
  detail?: string;
  prevHash: string;
  hash: string;
}

export interface AuditVerify {
  valid: boolean;
  brokenAt?: number;
  entries: number;
  head?: string;
}
