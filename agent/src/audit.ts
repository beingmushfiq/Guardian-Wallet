import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { AuditEntry } from './types.js';

const FILE = process.env.AUDIT_FILE ?? './audit.jsonl';
const GENESIS = '0x' + '0'.repeat(64);

const sha = (s: string) => '0x' + createHash('sha256').update(s).digest('hex');

const replacer = (_k: string, v: unknown) => (typeof v === 'bigint' ? v.toString() : v);

export function auditFilePath(): string {
  return FILE;
}

function readAll(): AuditEntry[] {
  if (!existsSync(FILE)) return [];
  return readFileSync(FILE, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as AuditEntry);
}

export function appendAudit(body: Record<string, unknown>): AuditEntry {
  const all = readAll();
  const prev = all.length ? all[all.length - 1].hash : GENESIS;
  const entry = { seq: all.length + 1, ts: new Date().toISOString(), ...body, prevHash: prev } as Omit<
    AuditEntry,
    'hash'
  >;
  const hash = sha(prev + JSON.stringify(entry, replacer));
  const complete = { ...entry, hash } as AuditEntry;
  mkdirSync(dirname(FILE), { recursive: true });
  appendFileSync(FILE, JSON.stringify(complete, replacer) + '\n');
  return complete;
}

export function verifyChain(): { valid: boolean; brokenAt?: number; entries: number; head?: string } {
  const all = readAll();
  let prev = GENESIS;
  for (const e of all) {
    const { hash, ...rest } = e;
    const recomputed = sha(prev + JSON.stringify(rest, replacer));
    if (e.prevHash !== prev || hash !== recomputed) return { valid: false, brokenAt: e.seq, entries: all.length };
    prev = hash;
  }
  return { valid: true, entries: all.length, head: prev };
}

export function readAudit(limit = 50): AuditEntry[] {
  return readAll().slice(-limit).reverse();
}
