# Guardian Wallet

**The AI proposes; deterministic policy and an on-chain vault dispose.**

Guardian Wallet is an AI wallet agent with *enforced* autonomy. You chat in natural language ("Pay tuition $40"), an LLM proposes a typed transfer, a deterministic policy engine assigns a permission tier, and a Solidity vault independently enforces allowlists and spend caps before any money moves. A compromised model, a prompt-injected invoice, or a poisoned address cannot exceed what the contract allows.

Built for the Fintechathon (Base Sepolia, chain ID 84532).

---

## Features

- **Natural-language stablecoin payments** — USDC (6 decimals) via MockUSDC on testnet.
- **Permission tiers T0–T3 + BLOCK** with a plain-English reason for every decision.
- **Dual-layer limits** — off-chain policy engine *and* on-chain `perTxCap` / `dailyCap`, so bypassing the agent still reverts.
- **Prompt-injection defense** — attachments are tagged `<untrusted_document>`, scanned, and can never reach T2.
- **Address-poisoning detection** — first-4/last-4 lookalike matching against saved contacts.
- **T3 owner approval** — the owner key stays in the browser; the agent only prepares calldata and verifies the resulting `OwnerTransfer` event.
- **Tamper-evident audit log** — SHA-256 hash chain over JSONL with a live `verify` endpoint.
- **Safety mode and kill switch** — 3 blocks in 10 minutes forces all payments to T1 for 30 minutes; the agent can pause but never unpause or reconfigure.
- **Offline demo mode** — the whole product runs with no keys, no RPC, and no LLM key, using a simulated venue that applies the same rules as the contract.

---

## Architecture

```
┌──────────────┐   chat + attachment   ┌───────────────────────────────────────────┐
│  Next.js UI  │ ────────────────────► │              Agent service                │
│  (browser)   │ ◄──────────────────── │  ingest → planner → risk → policy         │
│              │   tier + reasons      │      │            │        │              │
│  owner wallet│                       │      │      simulation ──┘                  │
└──────┬───────┘                       └──────┼───────────────────────────────────────┘
       │ ownerTransfer (T3 only)              │ transferToken (T2, agent hot key)
       ▼                                      ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  GuardianVault (Base Sepolia)  ·  allowlists · per-tx cap · daily cap · replay   │
│  MockUSDC (6 decimals)                                                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Trust boundaries.** The LLM is untrusted data processing: it can only emit a typed `proposal_transfer` tool call and has no key. The policy engine never reads natural language. The vault never trusts the agent's judgement — it re-checks every rule on-chain. The owner's private key never leaves the browser.

Full design: [docs/technical-documentation.md](docs/technical-documentation.md).

---

## Quick start

### 0. Prerequisites

- Node 20+ (Node 22.5+ recommended; `node:sqlite` is used for local state)
- Foundry (`forge`) on `PATH` — on Windows add `%USERPROFILE%\.foundry\bin`
- Optional: Anthropic API key, Base Sepolia RPC + funded keys for live mode

### 1. Install

```bash
npm run install:all
```

### 2. Run offline (default, no keys required)

```bash
npm run dev:agent     # http://localhost:8787
npm run dev:web       # http://localhost:3000
npm run seed          # optional: two T2 demo payments
```

The service starts in **simulated** mode when `VAULT_ADDRESS` / `AGENT_PK` are empty and with the **fallback planner** when `ANTHROPIC_API_KEY` is empty. Every simulated transaction is labelled `simulated` in the UI and audit log.

### 3. Run live on Base Sepolia

```bash
cp .env.example .env      # fill DEPLOYER_PK, AGENT_PK, OWNER_ADDRESS, RPC_URL

cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts   # first time only
forge test -vv
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
# copy the printed MockUSDC + GuardianVault addresses into .env
```

Then, as **owner**, configure the vault:

```bash
cast send $VAULT_ADDRESS "setToken(address,bool,uint256,uint256)" $USDC_ADDRESS true 50000000 150000000 --rpc-url $RPC_URL
cast send $VAULT_ADDRESS "setRecipient(address,bool)" $TUITION_ADDRESS true --rpc-url $RPC_URL
cast send $VAULT_ADDRESS "setRecipient(address,bool)" $RAHIM_ADDRESS true --rpc-url $RPC_URL
```

Restart the agent, then open the web app, connect the owner wallet, and approve T3 cards in the browser.

---

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `RPC_URL` | `https://sepolia.base.org` | Base Sepolia RPC |
| `CHAIN_ID` | `84532` | Base Sepolia |
| `EXPLORER` | `https://sepolia.basescan.org` | Explorer base URL |
| `DEPLOYER_PK` | — | Deploy script only |
| `OWNER_ADDRESS` | zero address | User wallet; shown in UI, never used to sign server-side |
| `AGENT_PK` | — | Agent hot key; caps + `emergencyPause` only |
| `VAULT_ADDRESS` | empty | Empty ⇒ simulated mode |
| `USDC_ADDRESS` | Base Sepolia USDC | Token used by the agent |
| `RECIPIENT_TUITION` | `0x7a00…c0de` | Demo contact |
| `RECIPIENT_RAHIM` | `0x2b00…beef` | Demo contact |
| `ANTHROPIC_API_KEY` | empty | Empty ⇒ deterministic fallback planner |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-5` | Planner model |
| `PORT` | `8787` | Agent HTTP port |
| `AUDIT_FILE` | `./audit.jsonl` | Hash-chained audit log |
| `AGENT_DB` | `./guardian.db` | SQLite state (pending, transfers, blocks) |
| `WEB_ORIGIN` | `http://localhost:3000` | CORS origin |
| `PER_TX_CAP` | `50000000` | 50 USDC in base units |
| `DAILY_CAP` | `150000000` | 150 USDC in base units |

See [.env.example](.env.example).

---

## Permission tiers

| Tier | Condition (first match wins) | What happens |
|---|---|---|
| **BLOCK** | Paused · unknown token · lookalike address · risk ≥ 0.7 · simulation failure | No transaction. Counts toward safety mode. |
| **T1** | Untrusted document + injection pattern · safety mode active | Proposal shown, never executed. |
| **T3** | New recipient · over per-tx cap · over daily budget · risk ≥ 0.4 | Queued; owner signs `ownerTransfer` in the browser. |
| **T2** | Allowlisted recipient, within both caps, low risk | Agent hot key calls `transferToken` immediately. |
| **T0** | Read-only balance and policy queries | Agent answers, no proposal. |

---

## Tests

```bash
# Contracts — 25 tests (22 named + 3 fuzz)
cd contracts && forge test -vv

# Agent — 35 tests
cd agent && npm test && npm run typecheck

# Adversarial suite — 14 cases, writes attacks/RESULTS.md
npm run attacks

# Web production build
cd web && npm run build
```

Current status: **25/25 Foundry**, **35/35 Vitest**, **14/14 attack cases**, **web build clean**.

---

## Attack suite

`attacks/cases/*.json` covers prompt injection, address poisoning, per-tx and daily caps, unknown tokens, agent privilege escalation, replay, audit tampering, safety mode, paused vault, ambiguity, and secret exfiltration. Each case is executed at the layer that must stop it (agent, policy engine, audit chain, or the actual Foundry test).

Results: [attacks/RESULTS.md](attacks/RESULTS.md).

---

## Repository layout

```
contracts/   Foundry project: GuardianVault, MockUSDC, tests, deploy script
agent/       TypeScript service: ingest, planner, risk, policy, venue, orchestrator, Fastify API
web/         Next.js 14 chat UI (wagmi injected connector, Tailwind)
attacks/     14-case runner + RESULTS.md
demo/        malicious + legitimate invoices, seed script
docs/        plan, technical documentation, security self-assessment, execution evidence,
             presentation deck outline, demo script
```

---

## Submission documents

| Document | Contents |
|---|---|
| [docs/technical-documentation.md](docs/technical-documentation.md) | Architecture, algorithms, contract spec, API reference |
| [docs/security-self-assessment.md](docs/security-self-assessment.md) | Tier enforcement, controls, attack results, known risks |
| [docs/execution-evidence.md](docs/execution-evidence.md) | Reproduced test output and on-chain evidence table |
| [docs/deck-outline.md](docs/deck-outline.md) | 12-slide presentation plan with speaker notes |
| [docs/demo-script.md](docs/demo-script.md) | Scene-by-scene 5-minute demo script |
| [attacks/RESULTS.md](attacks/RESULTS.md) | Generated adversarial test results |
| [THIRD_PARTY.md](THIRD_PARTY.md) | Dependency licenses |

---

## Known limitations

This is a testnet prototype, not audited production software. Highlights: pattern-based injection detection, a single agent hot key (loss bounded by the daily cap), local-only audit log (whole-file replacement is undetectable without on-chain anchoring), trusting the RPC for simulation, and an owner key whose compromise is out of scope (hardware wallet / multisig on the roadmap).

Full list and mitigations: [docs/security-self-assessment.md](docs/security-self-assessment.md).

---

## License

MIT — see [LICENSE](LICENSE).
