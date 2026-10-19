# Guardian Wallet — Presentation Deck Guide & Outline

**Target Speaking Time**: ≤10 Minutes (Strictly timed: 8:15 talk + 1:45 Q&A)  
**Deliverable Document**: Full slide-by-slide script, layout, and judge defense matrix in [`docs/presentation-deck.md`](presentation-deck.md).  
**Core Slogan**: *"The AI proposes; deterministic policy and an on-chain vault dispose."*

---

## 1. Slide Deck Overview (12 Slides)

| # | Slide Title | Core Message & Focus | Time Allocation |
|---|---|---|---|
| **1** | **Title & The Vision** | Guardian Wallet · FinTechathon Topic F (AI Wallet Agent) · Enforced Autonomy | 0:00 – 0:35 (35s) |
| **2** | **The Three Fatal Traps** | Prompt injection in invoices, address poisoning, and over-permissioned hot keys | 0:35 – 1:25 (50s) |
| **3** | **The Architectural Insight** | Separation of Understanding (LLM parser) from Authority (code + vault) | 1:25 – 2:10 (45s) |
| **4** | **End-to-End System Pipeline** | Next.js UI → Ingestion → Risk Engine → Policy Engine → Simulation → Vault | 2:10 – 3:00 (50s) |
| **5** | **The 5 Permission Tiers** | Formal matrix: T0 Read, T1 Propose, T2 Auto-Pay, T3 Owner Approval, BLOCK | 3:00 – 3:45 (45s) |
| **6** | **Live Production Verification** | Walkthrough of 5 flows: Auto-pay, Approval card, Injection, Poisoning, Revert | 3:45 – 5:15 (90s) |
| **7** | **Tamper-Evident Audit Trail** | SHA-256 continuous hash chaining and dynamic tamper detection (`brokenAt: 3`) | 5:15 – 6:00 (45s) |
| **8** | **Comprehensive QA & Verification** | 31 Foundry tests (inc. fuzzing), 41 Vitest tests, 14 Adversarial attack tests | 6:00 – 6:45 (45s) |
| **9** | **FinTechathon Scoring Alignment** | 40% Task Completion, 30% Security, 30% Innovation, 0–5 Bonus Points | 6:45 – 7:25 (40s) |
| **10** | **Real-World Impact & Personas** | Cross-border tuition payments, freelancer income automation, small treasuries | 7:25 – 7:50 (25s) |
| **11** | **Production Roadmap** | ERC-4337 session keys, Safe multisig owner, on-chain audit anchoring | 7:50 – 8:15 (25s) |
| **12** | **Conclusion & Q&A Defense** | "Spend with intent, not blind trust" · Full Judge Q&A Defense Matrix | 8:15 – 8:30 (15s) |

---

## 2. Key Speaking Points & Rules

1. **Keep it under 10 minutes**: The presentation is timed for 8 minutes and 15 seconds, leaving an automatic 1 minute 45 seconds buffer for judge questions.
2. **Never claim LLM safety as the primary guard**: Always emphasize that the LLM is an untrusted natural-language parser. Security is structural and enforced on-chain.
3. **Show, Don't Just Tell**: Refer directly to `docs/execution-evidence.md` for confirmed on-chain transaction hashes and `attacks/RESULTS.md` for the 14/14 adversarial pass rate.
4. **Refer to the Full Script**: See [`docs/presentation-deck.md`](presentation-deck.md) for the verbatim narration and complete slide layouts.
