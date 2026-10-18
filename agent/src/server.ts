import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config, explorerAddress, isLiveMode } from './config.js';
import { createVenue } from './chain.js';
import { openStore, resetSimLedger } from './store.js';
import { readAudit, verifyChain } from './audit.js';
import {
  approvalPayload,
  approvePending,
  pauseVault,
  pendingApprovals,
  rejectPending,
  resetDemoState,
  runTurn,
  safetyModeUntil,
} from './orchestrator.js';
import { formatUnits } from './planner.js';

openStore(config.dbFile);
const venue = createVenue();

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
await app.register(cors, { origin: true });

app.get('/api/health', async () => ({
  ok: true,
  mode: venue.mode,
  planner: config.anthropicKey ? 'llm' : 'fallback',
  chainId: config.chainId,
}));

app.get('/api/state', async () => {
  const s = await venue.readState();
  return {
    mode: venue.mode,
    planner: config.anthropicKey ? 'llm' : 'fallback',
    chainId: config.chainId,
    explorer: config.explorer,
    vault: config.vaultAddress || null,
    owner: config.ownerAddress,
    token: config.token,
    balance: formatUnits(s.balance),
    balanceRaw: s.balance.toString(),
    spentToday: formatUnits(s.spentToday),
    perTxCap: formatUnits(s.perTxCap),
    dailyCap: formatUnits(s.dailyCap),
    paused: s.paused,
    safetyModeUntil: safetyModeUntil(),
    contacts: config.contacts,
    recipientAllowlist: [...s.recipientAllowlist],
    tokenAllowlist: [...s.tokenAllowlist],
    explorerVault: config.vaultAddress ? explorerAddress(config.vaultAddress) : null,
    live: isLiveMode(),
  };
});

app.post('/api/chat', async (req, reply) => {
  const { message, attachment } = (req.body ?? {}) as { message?: string; attachment?: string };
  if (!message || typeof message !== 'string') return reply.code(400).send({ error: 'message is required' });
  if (message.length > 2000) return reply.code(400).send({ error: 'message too long' });
  try {
    return await runTurn({ venue, userMessage: message, untrustedAttachment: attachment });
  } catch (e) {
    req.log.error(e);
    return reply.code(500).send({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/api/pending', async () => ({ pending: pendingApprovals() }));

const HEX_32_RE = /^0x[0-9a-fA-F]{64}$/;

app.get('/api/approval/:intentId', async (req, reply) => {
  const { intentId } = req.params as { intentId: string };
  if (!HEX_32_RE.test(intentId)) return reply.code(400).send({ error: 'Invalid intentId format: must be 32-byte hex string' });
  try {
    return approvalPayload(venue, intentId);
  } catch (e) {
    return reply.code(404).send({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/approve/:intentId', async (req, reply) => {
  const { intentId } = req.params as { intentId: string };
  if (!HEX_32_RE.test(intentId)) return reply.code(400).send({ error: 'Invalid intentId format: must be 32-byte hex string' });
  const { txHash } = (req.body ?? {}) as { txHash?: string };
  if (txHash && !HEX_32_RE.test(txHash)) return reply.code(400).send({ error: 'Invalid txHash format: must be 32-byte hex string' });
  try {
    return await approvePending(venue, intentId, txHash);
  } catch (e) {
    return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/reject/:intentId', async (req, reply) => {
  const { intentId } = req.params as { intentId: string };
  if (!HEX_32_RE.test(intentId)) return reply.code(400).send({ error: 'Invalid intentId format: must be 32-byte hex string' });
  try {
    rejectPending(intentId);
    return { ok: true };
  } catch (e) {
    return reply.code(400).send({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/api/pause', async (req, reply) => {
  try {
    return await pauseVault(venue);
  } catch (e) {
    return reply.code(500).send({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/api/audit', async (req) => {
  const limit = Number((req.query as { limit?: string }).limit ?? 50);
  return { entries: readAudit(Number.isFinite(limit) ? Math.min(limit, 500) : 50) };
});

app.get('/api/audit/verify', async () => verifyChain());

/** Demo helper: clears simulated pause, spend window, blocks and safety mode. */
app.post('/api/demo/reset', async () => {
  resetDemoState();
  if (venue.mode === 'simulated') resetSimLedger(1_000_000_000n);
  return { ok: true };
});

const port = config.port;
await app.listen({ port, host: '0.0.0.0' });
app.log.info(`Guardian agent listening on :${port} in ${venue.mode} mode`);
