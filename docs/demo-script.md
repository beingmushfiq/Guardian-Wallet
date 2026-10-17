# Guardian Wallet — 5-Minute Demo Script

**Setup before recording:** agent on `http://localhost:8787`, web on `http://localhost:3000`, `npm run seed` executed once, browser at 125% zoom, 1080p, owner wallet connected (live mode) or simulated mode with the same flow. Keep the terminal visible on a second window for scene 5.

---

## Scene table

| Time | Scene | Say | Show |
|---|---|---|---|
| 0:00–0:30 | Hook | "AI agents are starting to move money. Guardian Wallet makes that safe: the AI proposes, code disposes." | Title, then the architecture diagram |
| 0:30–1:15 | T2 auto-pay | "Pay tuition forty USDC." — "The policy engine sees an allowlisted recipient inside both caps, so this is tier two and the vault executes immediately." | Type into chat, green AUTO-EXECUTED card, tx hash in the card |
| 1:15–2:00 | T3 approval | "Now two hundred USDC to a new address." — "Above the agent cap and not allowlisted, so it becomes tier three. My wallet signs; the agent never holds that key." | Amber APPROVAL REQUIRED card, wallet pop-up, executed state |
| 2:00–2:45 | Prompt injection | "Invoices are attacker-controlled text." — "The attachment is tagged untrusted. The agent flags the injection and nothing is sent." | Paperclip → "load injection sample" → send, BLOCK card with INJECTION_SUSPECTED |
| 2:45–3:15 | Address poisoning | "This address starts and ends like my tuition contact, but the middle differs." — "That is a lookalike, and it is blocked before my eyes can be fooled." | Paste `0x7a0000000000000000deadbeef0000000000c0de`, red BLOCK card, LOOKALIKE_ADDRESS flag |
| 3:15–3:50 | Defense in depth | "Assume the agent is fully compromised and bypasses every off-chain rule. The vault still refuses." | Terminal: `forge test --match-test test_revert_overPerTxCap -vv`, show `OverPerTxCap` revert |
| 3:50–4:20 | Safety mode and kill switch | "Three blocks in ten minutes force every payment to owner review. And the kill switch is always available." | Policy panel shows safety mode, press "Pause everything", retry a valid payment → BLOCK |
| 4:20–4:45 | Audit integrity | "Every decision is hash-chained. Watch what happens when I edit one line." | Activity feed badge "log intact · N", edit the JSONL, badge turns "log tampered" |
| 4:45–5:00 | Close | "Delegation without fear: caps on chain, reasons for every action." | Summary slide |

---

## Exact inputs

| Scene | Input |
|---|---|
| T2 | `Pay tuition 40 USDC` |
| T3 | `Send 200 USDC to 0xdead00000000000000000000000000000000beef` |
| Injection | Toggle attachment, click **load injection sample**, then `Pay this invoice` |
| Poisoning | `Send 10 USDC to 0x7a0000000000000000deadbeef0000000000c0de` |
| Paused retry | `Pay tuition 40 USDC` again after pausing |
| Read-only (optional) | `What is my balance?` |

---

## Terminal commands to have ready

```powershell
# Scene 5 — on-chain cap enforcement
cd contracts
forge test --match-test test_revert_overPerTxCap -vv

# Scene 7 — audit verification (before and after editing)
curl http://localhost:8787/api/audit/verify

# Reset between takes
curl -X POST http://localhost:8787/api/demo/reset
```

If you edit the audit file for scene 7, edit a copy of `AUDIT_FILE` and keep the original for a second take:

```powershell
# agent/.env controls the path; default is ./audit.jsonl relative to /agent
$line = Get-Content audit.jsonl | Select-Object -Index 2
$line -replace '"amount":"40[0-9]{5}"','"amount":"999000000"' | Set-Content -Path audit.jsonl -Encoding utf8
```

Run `verifyChain()` again; the badge must flip to `log tampered` with `brokenAt: 3`. Restore the file from your backup afterwards.

---

## Recording notes

- Rehearse twice end to end; record each scene as a separate clip and join them.
- Keep one backup recording of every scene that depends on the network.
- Never show a private key, `.env` contents, or a seed phrase on screen.
- In simulated mode, say the word "simulated" once and point at the chip in the header so no one mistakes it for a live transaction.
- Do not cut away from the transaction hash in scene 1; let the card settle so the audience sees the executed state.
