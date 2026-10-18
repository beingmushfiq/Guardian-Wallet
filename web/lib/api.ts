import type { AgentState, ApprovalPayload, AuditEntry, AuditVerify, PendingApproval, TurnResponse } from './types';

export const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? '';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  state: () => call<AgentState>('/api/state'),
  chat: (message: string, attachment?: string) =>
    call<TurnResponse>('/api/chat', { method: 'POST', body: JSON.stringify({ message, attachment }) }),
  pending: () => call<{ pending: PendingApproval[] }>('/api/pending'),
  approval: (intentId: string) => call<ApprovalPayload>(`/api/approval/${intentId}`),
  approve: (intentId: string, txHash?: string) =>
    call<{ ok: true; txHash: string; mode: 'live' | 'simulated'; explorerUrl?: string }>(
      `/api/approve/${intentId}`,
      { method: 'POST', body: JSON.stringify({ txHash }) },
    ),
  reject: (intentId: string) => call<{ ok: true }>(`/api/reject/${intentId}`, { method: 'POST', body: '{}' }),
  pause: () => call<{ txHash: string; mode: string }>('/api/pause', { method: 'POST', body: '{}' }),
  audit: (limit = 40) => call<{ entries: AuditEntry[] }>(`/api/audit?limit=${limit}`),
  verify: () => call<AuditVerify>('/api/audit/verify'),
  reset: () => call<{ ok: true }>('/api/demo/reset', { method: 'POST', body: '{}' }),
  updateCaps: (perTxCap: string, dailyCap: string) =>
    call<{
      ok: true;
      perTxCap?: string;
      dailyCap?: string;
      call?: { to: `0x${string}`; data: `0x${string}`; value: '0'; chainId: number };
      mode: 'live' | 'simulated';
    }>('/api/policy/caps', {
      method: 'POST',
      body: JSON.stringify({ perTxCap, dailyCap }),
    }),
  addPayee: (name: string, address: string) =>
    call<{
      ok: true;
      mode: 'live' | 'simulated';
      contact: { name: string; address: string; allowlisted: boolean };
      call?: { to: `0x${string}`; data: `0x${string}`; value: '0'; chainId: number; description?: string };
    }>('/api/policy/recipients', {
      method: 'POST',
      body: JSON.stringify({ name, address }),
    }),
};

export const short = (a?: string, n = 4) => (a ? `${a.slice(0, n + 2)}…${a.slice(-n)}` : '—');
