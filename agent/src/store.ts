import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Address, Proposal } from './types.js';

// Loaded via createRequire so test runners (Vite) do not try to bundle the
// Node built-in `node:sqlite`. Node >= 22.5 ships it; no native dependency.
const require = createRequire(import.meta.url);

let DatabaseSyncClass: any = null;
try {
  const sqliteMod = require('node:sqlite');
  DatabaseSyncClass = sqliteMod?.DatabaseSync ?? null;
} catch {
  // node:sqlite is available on Node >= 22.5
}

class MemoryFallbackDB {
  private tables: Record<string, any[]> = {
    pending: [],
    transfers: [],
    blocks: [],
    meta: [],
  };

  exec(_sql: string) {}
  close() {}

  prepare(sql: string) {
    const s = sql.trim();
    return {
      run: (...args: any[]) => {
        if (s.startsWith('INSERT OR REPLACE INTO pending')) {
          const [intent_id, created_at, payload, user_message, status] = args;
          this.tables.pending = this.tables.pending.filter((r) => r.intent_id !== intent_id);
          this.tables.pending.push({ intent_id, created_at, payload, user_message, status });
        } else if (s.startsWith('UPDATE pending SET status')) {
          const [status, intent_id] = args;
          const found = this.tables.pending.find((r) => r.intent_id === intent_id);
          if (found) found.status = status;
        } else if (s.startsWith('INSERT INTO transfers')) {
          const [intent_id, token, to_address, amount, tx_hash, created_at] = args;
          this.tables.transfers.push({ id: this.tables.transfers.length + 1, intent_id, token, to_address, amount, tx_hash, created_at });
        } else if (s.startsWith('INSERT INTO blocks')) {
          const [created_at, reason] = args;
          this.tables.blocks.push({ id: this.tables.blocks.length + 1, created_at, reason });
        } else if (s.startsWith('DELETE FROM blocks')) {
          this.tables.blocks = [];
        } else if (s.startsWith('INSERT INTO meta')) {
          const [key, value] = args;
          this.tables.meta = this.tables.meta.filter((r) => r.key !== key);
          this.tables.meta.push({ key, value });
        }
      },
      all: (...args: any[]) => {
        if (s.includes('FROM pending')) {
          return this.tables.pending.filter((r) => r.status === 'pending');
        } else if (s.includes('FROM transfers')) {
          const limit = args[0] || 10;
          return [...this.tables.transfers].reverse().slice(0, limit);
        }
        return [];
      },
      get: (...args: any[]) => {
        if (s.includes('FROM pending WHERE intent_id = ?')) {
          return this.tables.pending.find((r) => r.intent_id === args[0]) || null;
        } else if (s.includes('COUNT(*) AS c FROM blocks')) {
          const since = args[0] || 0;
          const c = this.tables.blocks.filter((r) => r.created_at >= since).length;
          return { c };
        } else if (s.includes('FROM meta WHERE key = ?')) {
          return this.tables.meta.find((r) => r.key === args[0]);
        }
        return null;
      },
    };
  }
}

/**
 * Local persistence: pending T3 approvals, recent spend history, block counters,
 * safety-mode state, and the simulated vault ledger.
 */

export interface PendingRow {
  intentId: `0x${string}`;
  createdAt: number;
  proposal: Proposal;
  userMessage: string;
}

type DB = any;

let db: DB | null = null;

export function openStore(file: string): DB {
  if (db) return db;
  mkdirSync(dirname(file), { recursive: true });
  if (DatabaseSyncClass) {
    db = new DatabaseSyncClass(file);
  } else {
    db = new MemoryFallbackDB();
  }
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending (
      intent_id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      payload TEXT NOT NULL,
      user_message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE TABLE IF NOT EXISTS transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intent_id TEXT NOT NULL,
      token TEXT NOT NULL,
      to_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      reason TEXT
    );
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

export function closeStore(): void {
  db?.close();
  db = null;
}

const getDb = () => {
  if (!db) throw new Error('Store not opened. Call openStore(file) first.');
  return db;
};

// ---------------------------------------------------------------------------
// Pending approvals
// ---------------------------------------------------------------------------
export function addPending(p: Proposal, userMessage: string): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO pending (intent_id, created_at, payload, user_message, status) VALUES (?, ?, ?, ?, ?)')
    .run(p.intentId, Date.now(), JSON.stringify(p, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)), userMessage, 'pending');
}

export function listPending(): Array<PendingRow & { createdAt: number }> {
  const rows = getDb().prepare("SELECT * FROM pending WHERE status = 'pending' ORDER BY created_at ASC").all() as any[];
  return rows.map((r) => ({
    intentId: r.intent_id,
    createdAt: r.created_at,
    proposal: reviveProposal(JSON.parse(r.payload)),
    userMessage: r.user_message,
  }));
}

export function getPending(intentId: string): (PendingRow & { status: string }) | null {
  const row = getDb().prepare('SELECT * FROM pending WHERE intent_id = ?').get(intentId) as any;
  if (!row) return null;
  return {
    intentId: row.intent_id,
    createdAt: row.created_at,
    proposal: reviveProposal(JSON.parse(row.payload)),
    userMessage: row.user_message,
    status: row.status,
  };
}

export function setPendingStatus(intentId: string, status: 'pending' | 'approved' | 'rejected'): void {
  getDb().prepare('UPDATE pending SET status = ? WHERE intent_id = ?').run(status, intentId);
}

function reviveProposal(raw: any): Proposal {
  return { ...raw, amount: BigInt(raw.amount) } as Proposal;
}

// ---------------------------------------------------------------------------
// Transfer history (risk engine: amount anomaly)
// ---------------------------------------------------------------------------
export function recordTransfer(p: Proposal, txHash?: string): void {
  getDb()
    .prepare('INSERT INTO transfers (intent_id, token, to_address, amount, tx_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(p.intentId, p.token, p.to, p.amount.toString(), txHash ?? null, Date.now());
}

export function recentAmounts(limit = 10): bigint[] {
  const rows = getDb().prepare('SELECT amount FROM transfers ORDER BY id DESC LIMIT ?').all(limit) as any[];
  return rows.map((r) => BigInt(r.amount));
}

// ---------------------------------------------------------------------------
// Block counter / safety mode
// ---------------------------------------------------------------------------
export function recordBlock(reason: string): void {
  getDb().prepare('INSERT INTO blocks (created_at, reason) VALUES (?, ?)').run(Date.now(), reason);
}

export function blocksInWindow(windowMs: number, now = Date.now()): number {
  const row = getDb()
    .prepare('SELECT COUNT(*) AS c FROM blocks WHERE created_at >= ?')
    .get(now - windowMs) as { c: number };
  return row.c;
}

export function clearBlocks(): void {
  getDb().prepare('DELETE FROM blocks').run();
}

// ---------------------------------------------------------------------------
// Meta / simulated ledger
// ---------------------------------------------------------------------------
export function getMeta(key: string): string | null {
  const row = getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setMeta(key: string, value: string): void {
  getDb().prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
}

export interface SimLedger {
  paused: boolean;
  balance: bigint;
  spent: bigint;
  windowStart: number; // epoch seconds
  perTxCap?: bigint;
  dailyCap?: bigint;
  spentByRecipient: Record<string, string>; // unused map kept for extension
}

export function readSimLedger(initialBalance: bigint): SimLedger {
  const raw = getMeta('sim_ledger');
  if (!raw) return { paused: false, balance: initialBalance, spent: 0n, windowStart: 0, spentByRecipient: {} };
  const parsed = JSON.parse(raw);
  return {
    paused: Boolean(parsed.paused),
    balance: BigInt(parsed.balance),
    spent: BigInt(parsed.spent),
    windowStart: Number(parsed.windowStart),
    perTxCap: parsed.perTxCap ? BigInt(parsed.perTxCap) : undefined,
    dailyCap: parsed.dailyCap ? BigInt(parsed.dailyCap) : undefined,
    spentByRecipient: parsed.spentByRecipient ?? {},
  };
}

export function writeSimLedger(l: SimLedger): void {
  setMeta(
    'sim_ledger',
    JSON.stringify({
      paused: l.paused,
      balance: l.balance.toString(),
      spent: l.spent.toString(),
      windowStart: l.windowStart,
      perTxCap: l.perTxCap ? l.perTxCap.toString() : undefined,
      dailyCap: l.dailyCap ? l.dailyCap.toString() : undefined,
      spentByRecipient: l.spentByRecipient,
    }),
  );
}

export function resetSimLedger(initialBalance: bigint): void {
  writeSimLedger({ paused: false, balance: initialBalance, spent: 0n, windowStart: 0, spentByRecipient: {} });
}

// ---------------------------------------------------------------------------
// Recipient helper & custom contacts persistence
// ---------------------------------------------------------------------------
export function truncateAddress(a: Address, chars = 4): string {
  return `${a.slice(0, chars + 2)}…${a.slice(-chars)}`;
}

export interface CustomContactItem {
  name: string;
  address: Address;
  allowlisted: boolean;
}

export function getCustomContacts(): CustomContactItem[] {
  const raw = getMeta('custom_contacts');
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addCustomContact(c: { name: string; address: Address; allowlisted?: boolean }): CustomContactItem[] {
  const existing = getCustomContacts();
  const lower = c.address.toLowerCase();
  const filtered = existing.filter((item) => item.address.toLowerCase() !== lower);
  filtered.push({
    name: c.name.trim(),
    address: c.address,
    allowlisted: c.allowlisted !== false,
  });
  setMeta('custom_contacts', JSON.stringify(filtered));
  return filtered;
}
