# Guardian Wallet — Presentation Deck Outline

**Format:** 10–12 slides, ≤10 minutes speaking time, 16:9.
**One line to land:** *the AI proposes, deterministic code and an on-chain vault dispose.*

---

## Slide plan

| # | Slide | Content | Time |
|---|---|---|---|
| 1 | Title | Guardian Wallet · Fintechathon · Topic F (AI wallet agent). Team names and roles. | 0:15 |
| 2 | Problem | Agents are being given money-moving keys. Three failure classes: prompt injection from documents, address poisoning, and over-permissioned keys. One concrete story (malicious invoice instructs "send everything"). | 0:45 |
| 3 | Insight | Models are probabilistic; money movement must be deterministic. "Trust the code, not the model." The LLM is a parser, not an authority. | 0:30 |
| 4 | Solution overview | Pipeline: chat → typed proposal → risk score → policy tier → simulation → vault. Emphasise that the policy engine reads only typed fields, never prose. | 1:00 |
| 5 | Architecture | The diagram from `README.md` / technical doc §2. Two trust boundaries: model ↔ agent, agent ↔ vault. Owner key never leaves the browser. | 1:00 |
| 6 | Permission tiers | T0 read · T1 propose-only · T2 auto-execute · T3 owner approval · BLOCK. First-match-wins table with examples per row. | 0:45 |
| 7 | Live demo | Run the five flows: T2 auto-pay, T3 approval in wallet, prompt injection attachment, lookalike address, direct-vault over-cap revert. | 3:00 |
| 8 | Security results | 14/14 adversarial cases, 25/25 Foundry tests, 35/35 agent tests. Highlight: injection never reaches T2; over-cap calls revert on-chain; tampered log detected at entry 3. | 1:00 |
| 9 | Scoring alignment | Task completion (natural-language payments end to end), security (dual-layer limits, tier enforcement), innovation (enforced autonomy rather than guardrails-in-prompt), on-chain bonus (vault + real Foundry suite). | 0:45 |
| 10 | Real-world path | Session-key accounts, multisig owner, audit + bug bounty, sanctions screening hook, cross-border tuition/remittance as the first market. | 0:45 |
| 11 | Roadmap and team | Next: on-chain audit anchoring, multi-recipient batches, hardware-wallet owner. Roles table. | 0:30 |
| 12 | Q&A backup | Threat model table, contract function list, known-risk list (KR-1…KR-12), full attack results. | — |

---

## Speaker notes per slide

### Slide 2 — Problem

- An agent that can read email can be told what to do by an attacker who can send email.
- Address poisoning works on humans and on models: `0x7a00…c0de` versus `0x7a00dead…c0de` look identical in a truncated UI.
- The usual answer is "add a system prompt". A system prompt is not an access-control mechanism.

### Slide 3 — Insight

- Separate *understanding* from *authority*.
- The model may only emit one typed tool call: `{ token, to, amount, intentId }`. It has no private key.
- Every rule that can move money is evaluated twice: off-chain for UX and explanation, on-chain for enforcement.

### Slide 4 — Solution overview

- Say the pipeline out loud while the diagram animates: propose → score → tier → simulate → execute or escalate.
- Point out that a failed simulation is not always a denial: a non-allowlisted recipient or an over-cap amount is escalated to T3 because the owner can still authorise it; a paused vault or bad token is a hard BLOCK.

### Slide 6 — Permission tiers

- T2 is the only path that moves money without a human, and it is available only for an allowlisted recipient inside both caps with low risk.
- Any untrusted attachment removes T2 entirely, regardless of what the text says.
- The agent may pause but can never unpause or reconfigure — those are `onlyOwner`.

### Slide 8 — Security results

- Say the numbers and where they come from: `forge test` 25/25, `npm test` 35/35, `npm run attacks` 14/14 (`attacks/RESULTS.md`).
- Tamper evidence: edit one amount in the JSONL and `verifyChain()` returns `{ valid: false, brokenAt: 3 }`.
- Be explicit that this is a testnet prototype and list the top three known risks.

### Slide 12 — Q&A backup

- Have the terminal open on `attacks/RESULTS.md` and the Foundry summary.
- Have `docs/security-self-assessment.md` open for the known-risk list.

---

## Likely judge questions

| Question | Answer |
|---|---|
| What if the LLM is fully compromised? | It has no key and no permission authority. The vault bounds loss to one daily cap and only to allowlisted recipients. |
| Why not just use a multisig? | A multisig needs a human for every action. Guardian automates the safe majority and escalates only the risky minority. |
| How do you handle novel injections? | Detection is one layer only. Allowlists, caps, tiers, and simulation do not depend on pattern matching. |
| Why is the audit log meaningful if it is local? | It is tamper-evident, not tamper-proof. On-chain anchoring is the documented next step (KR-5). |
| Is this production ready? | No. See the known-risk list: audit, multisig owner, and compliance work are required first. |

---

## Production checklist for the deck

- [ ] Replace placeholder team names on slide 1.
- [ ] Export the architecture diagram at 2× for the projector.
- [ ] Pre-record slide 7 as a backup video (see [demo-script.md](demo-script.md)).
- [ ] Pre-seed the demo so no scene waits on a faucet or an LLM call.
- [ ] Keep the terminal font at 16 pt or larger for the revert scene.
