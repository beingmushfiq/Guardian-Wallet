/**
 * Guardian Wallet — adversarial test runner.
 *
 * Each case in ./cases is executed at the layer that is supposed to stop it:
 *   - agent-turn : full ingest -> planner -> risk -> policy -> venue pipeline (simulated venue)
 *   - policy     : deterministic policy engine on a hand-built proposal
 *   - audit-tamper: hash-chain verification after mutating a past entry
 *   - contract   : a Foundry test that proves the vault reverts
 *
 * Writes attacks/RESULTS.md and exits non-zero if any case fails.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const TMP = path.join(HERE, '.tmp');

// Must be set before importing the agent modules (config/audit/store read env at import).
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
process.env.AUDIT_FILE = path.join(TMP, 'attack-audit.jsonl');
process.env.AGENT_DB = path.join(TMP, 'attack.db');

const { config } = await import('../agent/src/config.js');
const { appendAudit, auditFilePath, verifyChain } = await import('../agent/src/audit.js');
const { openStore, resetSimLedger, clearBlocks } = await import('../agent/src/store.js');
const { SimulatedVenue } = await import('../agent/src/chain.js');
const { runTurn, safetyModeUntil, setSafetyMode } = await import('../agent/src/orchestrator.js');
const { assessRisk } = await import('../agent/src/risk.js');
const { decide } = await import('../agent/src/policy.js');

openStore(config.dbFile);
const venue = new SimulatedVenue();

interface CaseExpect {
  tiers?: string[];
  noExecution?: boolean;
  noProposal?: boolean;
  safetyMode?: boolean;
  forbiddenInText?: string[];
  flags?: string[];
  brokenAt?: number;
  revert?: string;
}

interface AttackCase {
  id: string;
  name: string;
  layer: string;
  kind: 'agent-turn' | 'policy' | 'audit-tamper' | 'contract';
  steps?: Array<{ message: string; attachment?: string }>;
  proposal?: { token: string; to: string; amount: string };
  pauseFirst?: boolean;
  alsoForgeTest?: string;
  forgeTest?: string;
  expect: CaseExpect;
}

interface CaseResult {
  c: AttackCase;
  actual: string;
  pass: boolean;
  evidence: string;
}

const casesDir = path.join(HERE, 'cases');
const cases = readdirSync(casesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(path.join(casesDir, f), 'utf8')) as AttackCase);

function resetLocalState(): void {
  clearBlocks();
  setSafetyMode(0);
  resetSimLedger(1_000_000_000n);
}

function runForge(testName: string): { ok: boolean; detail: string } {
  const forgeCandidates = [
    process.env.FORGE_BIN,
    path.join(process.env.USERPROFILE ?? '', '.foundry', 'bin', 'forge.exe'),
    'C:\\Users\\Aayan\\.foundry\\bin\\forge.exe',
  ].filter((f): f is string => Boolean(f));
  const forge = forgeCandidates.find((f) => existsSync(f)) ?? 'forge';
  try {
    const out = execFileSync(forge, ['test', '--match-test', testName, '-vv'], {
      cwd: path.join(ROOT, 'contracts'),
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 180_000,
    });
    const summary = /\[PASS\]|Suite result: ok/g.test(out) ? 'forge test passed' : 'forge test exit 0';
    return { ok: true, detail: summary };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    const text = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim();
    return { ok: false, detail: text.split('\n').slice(-3).join(' | ') || (err.message ?? 'forge failed') };
  }
}

async function runAgentTurn(c: AttackCase): Promise<{ actual: string; pass: boolean; evidence: string }> {
  resetLocalState();
  if (c.pauseFirst) await venue.pause();

  const seen: string[] = [];
  const evidences: string[] = [];
  let executed = 0;
  let proposals = 0;
  let allText = '';

  for (const step of c.steps ?? []) {
    const turn = await runTurn({ venue, userMessage: step.message, untrustedAttachment: step.attachment });
    allText += ` ${turn.assistantText}`;
    proposals += turn.results.length;
    for (const r of turn.results) {
      seen.push(r.tier);
      if (r.status === 'executed') executed += 1;
      evidences.push(`${r.tier}/${r.status} ${r.amountHuman} ${r.tokenSymbol} -> ${r.to.slice(0, 10)}… flags=[${r.flags.join(',')}]`);
    }
    if (!turn.results.length) evidences.push(`no proposal: "${turn.assistantText.slice(0, 90)}"`);
  }

  const e = c.expect;
  const problems: string[] = [];
  if (e.tiers && JSON.stringify(seen) !== JSON.stringify(e.tiers)) {
    problems.push(`expected tiers ${e.tiers.join(',')} but saw ${seen.join(',') || 'none'}`);
  }
  if (e.noExecution && executed > 0) problems.push(`expected no execution but ${executed} executed`);
  if (e.noProposal && proposals > 0) problems.push(`expected no proposal but ${proposals} produced`);
  if (e.safetyMode && !(safetyModeUntil() > Date.now())) problems.push('safety mode was not enabled');
  for (const forbidden of e.forbiddenInText ?? []) {
    if (allText.includes(forbidden)) problems.push(`response leaked "${forbidden}"`);
  }

  return {
    actual: problems.length ? problems.join('; ') : seen.length ? `tiers ${seen.join(', ')}` : 'no proposal (clarification/refusal)',
    pass: problems.length === 0,
    evidence: evidences.join(' ; '),
  };
}

async function runPolicyCase(c: AttackCase): Promise<{ actual: string; pass: boolean; evidence: string }> {
  resetLocalState();
  const state = await venue.readState();
  const p = {
    intentId: ('0x' + '1'.repeat(64)) as `0x${string}`,
    kind: 'transfer' as const,
    token: c.proposal!.token as `0x${string}`,
    to: c.proposal!.to as `0x${string}`,
    amount: BigInt(c.proposal!.amount),
    reason: 'attack case',
    tainted: false,
    injectionHits: [],
  };
  const risk = assessRisk(p, {
    vaultPaused: state.paused,
    tokenAllowlist: state.tokenAllowlist,
    recipientAllowlist: state.recipientAllowlist,
    perTxCap: state.perTxCap,
    dailyCap: state.dailyCap,
    spentToday: state.spentToday,
    recentAmounts: [],
    recentBlocksInWindow: 0,
    safetyModeUntil: 0,
    now: Date.now(),
  }, { recipientIsContract: false, simulationOk: true });
  const decision = decide(p, {
    vaultPaused: state.paused,
    tokenAllowlist: state.tokenAllowlist,
    recipientAllowlist: state.recipientAllowlist,
    perTxCap: state.perTxCap,
    dailyCap: state.dailyCap,
    spentToday: state.spentToday,
    recentAmounts: [],
    recentBlocksInWindow: 0,
    safetyModeUntil: 0,
    now: Date.now(),
  }, risk);

  const problems: string[] = [];
  if (c.expect.tiers && !c.expect.tiers.includes(decision.tier)) {
    problems.push(`expected ${c.expect.tiers.join('/')} but got ${decision.tier}`);
  }
  for (const flag of c.expect.flags ?? []) {
    if (!decision.flags.includes(flag)) problems.push(`missing flag ${flag}`);
  }
  return {
    actual: problems.length ? problems.join('; ') : `${decision.tier} (${decision.flags.join(',')})`,
    pass: problems.length === 0,
    evidence: decision.reasons.join(' '),
  };
}

function runAuditTamper(c: AttackCase): { actual: string; pass: boolean; evidence: string } {
  rmSync(auditFilePath(), { force: true });
  for (let i = 1; i <= 5; i++) {
    appendAudit({ status: 'seed', detail: `entry ${i}`, proposal: { token: config.token.address, to: c.id, amount: String(i * 1_000_000) } });
  }
  const file = auditFilePath();
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const third = JSON.parse(lines[2]);
  third.proposal.amount = '999000000';
  lines[2] = JSON.stringify(third);
  writeFileSync(file, lines.join('\n') + '\n');

  const verdict = verifyChain();
  const expected = c.expect.brokenAt ?? 3;
  const pass = !verdict.valid && verdict.brokenAt === expected;
  return {
    actual: verdict.valid ? 'chain reported valid after tampering' : `valid=false, brokenAt=${verdict.brokenAt}`,
    pass,
    evidence: `edited entry 3 amount; verifyChain() -> ${JSON.stringify(verdict)}`,
  };
}

function runContractCase(c: Pick<AttackCase, 'forgeTest'>): { actual: string; pass: boolean; evidence: string } {
  const test = c.forgeTest!;
  const res = runForge(test);
  return {
    actual: res.ok ? `revert confirmed by ${test}` : `forge failure: ${res.detail}`,
    pass: res.ok,
    evidence: `contracts: forge test --match-test ${test}`,
  };
}

const results: CaseResult[] = [];
for (const c of cases) {
  let r: { actual: string; pass: boolean; evidence: string };
  if (c.kind === 'agent-turn') r = await runAgentTurn(c);
  else if (c.kind === 'policy') r = await runPolicyCase(c);
  else if (c.kind === 'audit-tamper') r = runAuditTamper(c);
  else r = runContractCase(c);

  if (c.alsoForgeTest) {
    const extra = runForge(c.alsoForgeTest);
    r.evidence += ` ; vault: ${c.alsoForgeTest} ${extra.ok ? 'passed' : `FAILED (${extra.detail})`}`;
    if (!extra.ok) r.pass = false;
  }

  results.push({ c, ...r });
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.name}  -> ${r.actual}`);
}

const passed = results.filter((r) => r.pass).length;
const md = [
  '# Guardian Wallet — Attack Suite Results',
  '',
  `Generated: ${new Date().toISOString()}`,
  `Cases: ${results.length} · Passed: ${passed} · Failed: ${results.length - passed}`,
  '',
  '| # | Case | Layer | Expected | Actual | Pass | Evidence |',
  '|---|---|---|---|---|---|---|',
  ...results.map((r) => {
    const expected = JSON.stringify(r.c.expect).replace(/\|/g, '\\|');
    const actual = r.actual.replace(/\|/g, '\\|');
    const evidence = r.evidence.replace(/\|/g, '\\|').slice(0, 220);
    return `| ${r.c.id} | ${r.c.name} | ${r.c.layer} | ${expected} | ${actual} | ${r.pass ? 'PASS' : 'FAIL'} | ${evidence} |`;
  }),
  '',
  '> Agent-layer cases run the real orchestrator against the simulated venue (identical rules to',
  '> `GuardianVault`). Contract-layer cases execute the corresponding Foundry test, which asserts the',
  '> on-chain revert. Tamper detection edits a persisted JSONL entry and re-verifies the hash chain.',
  '',
].join('\n');

writeFileSync(path.join(HERE, 'RESULTS.md'), md, 'utf8');
console.log(`\n${passed}/${results.length} cases passed. Wrote attacks/RESULTS.md`);
process.exit(passed === results.length ? 0 : 1);
