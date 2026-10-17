/**
 * Demo seed: runs two benign, in-policy payments so the activity feed and spend
 * meter are populated before a demo. Safe to run repeatedly; each run uses fresh
 * intent IDs and respects the simulated daily cap.
 *
 *   node agent/node_modules/tsx/dist/cli.mjs demo/seed.ts
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
process.env.AUDIT_FILE ??= path.join(HERE, '..', 'agent', 'audit.jsonl');
process.env.AGENT_DB ??= path.join(HERE, '..', 'agent', 'guardian.db');

const { config } = await import('../agent/src/config.js');
const { openStore } = await import('../agent/src/store.js');
const { SimulatedVenue } = await import('../agent/src/chain.js');
const { runTurn } = await import('../agent/src/orchestrator.js');

openStore(config.dbFile);
const venue = new SimulatedVenue();

if (venue.mode !== 'simulated') {
  console.error('Seed is only for simulated mode. Configure VAULT_ADDRESS/AGENT_PK for live mode.');
  process.exit(1);
}

const prompts = ['Pay tuition 40 USDC', 'Send 15 USDC to Rahim'];

for (const message of prompts) {
  const turn = await runTurn({ venue, userMessage: message });
  for (const r of turn.results) {
    console.log(`${r.tier} ${r.status} — ${r.amountHuman} ${r.tokenSymbol} -> ${r.contactName ?? r.to}`);
  }
}

console.log('\nSeeded. Contacts:');
for (const c of config.contacts) console.log(`  ${c.name.padEnd(14)} ${c.address}  allowlisted=${c.allowlisted}`);
