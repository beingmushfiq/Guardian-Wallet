# Guardian Wallet

**Spend with intent, not blind trust.**

Guardian Wallet is an autonomous AI wallet agent with *enforced* policy boundaries. You speak in natural language ("Pay tuition $40"), the assistant evaluates intent, a deterministic policy engine validates security rules, and a smart contract vault enforces daily spending allowances and trusted payees before funds can move. A compromised AI model, a malicious prompt injection, or a lookalike address cannot override your spending limits.

- **GitHub Repository**: [https://github.com/beingmushfiq/Guardian-Wallet](https://github.com/beingmushfiq/Guardian-Wallet)
- **Target Network**: Base Sepolia (EVM Chain ID `84532`)
- **Theme**: "AI as a Financial Participant" · Topic F (AI Wallet Agent) · 2026 Shenzhen International FinTechathon

---

## 📑 Official Submission Deliverables Checklist

| Deliverable | Description | Location in Repo |
|---|---|---|
| **01 Technical Documentation** | System architecture, core algorithm description, security design | [`docs/technical-documentation.md`](docs/technical-documentation.md) |
| **02 Presentation Deck** | Final pitch deck (≤10 minutes speaking time, 12 slides + speaker notes) | [`docs/presentation-deck.md`](docs/presentation-deck.md) · [`docs/deck-outline.md`](docs/deck-outline.md) |
| **03 Demo Video Guide** | Timestamped video script & recording walkthrough (≤5 minutes) | [`docs/demo-script.md`](docs/demo-script.md) |
| **04 Source Code** | Complete codebase with README, GitHub link, deployment guide, test cases | [GitHub Repository](https://github.com/beingmushfiq/Guardian-Wallet) · [`README.md`](README.md) |
| **05 Security Self-Assessment** | Permission-tier implementation and comprehensive known-risk list | [`docs/security-self-assessment.md`](docs/security-self-assessment.md) |
| **06 Execution Evidence** | Real on-chain EVM transaction hashes, receipts, blocks, and sandbox audit logs | [`docs/execution-evidence.md`](docs/execution-evidence.md) |

---

## ✨ Web UI & Architecture: Modern Fintech Command Center

Guardian Wallet features a **Modern Fintech Command Center UI** designed according to strict **Antigravity Design** principles, vibrant fintech color palettes, and **WCAG AA 100% accessible contrast**:

- **Top Hero Command Section**:
  - **Biometric Holographic Shield HUD** (`web/components/vault-shield-hud.tsx`): High-performance vector HUD with glowing concentric security radar waves, live biometric fingerprint scanner, policy status pill, and instant one-tap Emergency Freeze. Eliminates heavy 3D WebGL overhead while delivering crisp aesthetics in both Light and Dark modes.
  - **Live Spending Telemetry**: High-precision allowance progress gauge, single payment cap, and owner governance notice.
  - **Emergency Action**: Quick-access tactile Freeze button.
- **Interactive Security Assistant (Left Workspace)**:
  - Natural-language payment agent with deterministic security validation.
  - **Interactive Security Launchpad**: Eliminates idle blank space with 4 one-tap scenario test cards (Instant Allowance, New Payee Review, Prompt Injection Sandbox, Lookalike Address Trap).
  - **4-Stage Cryptographic Pipeline**: Visual journey from AI Intent → Limits Check → Allowlist Guard → Vault Settlement.
  - **Expandable / Collapsible Test Scenarios** (`web/app/page.tsx`): Streamlined drawer that is **collapsed by default** to preserve maximum vertical chat workspace, with a one-tap toggle (`[ ✨ Quick Test Scenarios (5) ▾ ]`) to expand all test scenario pills.
  - **Crystal-Clear Payment Lifecycle** (`web/components/result-card.tsx`): Immediate visual state transitions upon approval (`✓ PAYMENT PAID & SETTLED ON-CHAIN` with transaction hash) or decline (`✕ PAYMENT DECLINED & CANCELLED`), permanently removing action buttons to prevent confusion or duplicate execution errors.
- **Unified Tabbed Management Center (Right Workspace)**:
  - Replaces disjointed bento boxes with a focused, ergonomic tab system:
    - 📋 **Activity Log**: Real-time SHA-256 hash-chained payment audit records.
    - 📊 **Spending Rules**: Detailed daily quota breakdown and caution mode triggers.
    - 👥 **Trusted Payees**: Whitelist contacts with one-click test actions.
    - 🔒 **Protection Rules**: Transparent smart contract power boundary guarantees.
- **Mobile-First Dynamic App View Navigation** (`web/components/bottom-navbar.tsx`):
  - Floating frosted-glass bottom navigation bar tailored for mobile devices.
  - 4 quick-switch view modes: 💬 **Assistant**, 🛡 **Vault**, 📋 **Activity**, and ⚙ **Rules**.
  - Includes real-time pending approval counter badges and active glowing indicators, eliminating 3000px vertical scrolling on mobile phones.
- **Vibrant Cyber-Emerald & Deep Indigo Mesh**:
  - Energetic gradients (cyber-emerald `#10b981`, electric lime `#a3e635`, cosmic indigo `#6366f1`, neon cyan `#06b6d4`, and ruby `#f43f5e`).
  - Tactile buttons with rich colored sheens, hover glows, and active click scaling.
- **Lenis Smooth Inertial Scrolling & Motion** (`web/components/smooth-scroll.tsx`):
  - High-performance Lenis inertial scroll physics with exponential decay interpolation, vertical lock, and `data-lenis-prevent` on internal scroll streams (chat & activity log).
- **Strict Zero-Horizontal-Scroll Architecture**:
  - Global `max-width: 100vw` and `overflow-x: clip` prevent accidental page bleeding or horizontal scrollbars across all screen widths.
  - Responsive multi-column wrapping on prompt suggestion pills.
  - Adaptive 2×2 mobile to 1×4 desktop grid for Management Center tabs, ensuring 100% viewport fit with zero clipped elements.
- **Luxury Floating Pill Toast** (`web/components/ui/toast.tsx`):
  - Dynamic Island-style floating notification pill positioned at top-center with clean, concise messages and subtle glowing accent dots.

---

## Core Features

- **Natural-Language Payments**: Request transfers in plain English; the assistant maps intent directly to USDC.
- **Tiered Spending Protection (T0–T3 + BLOCK)**: Clear, plain-English reason for every decision.
- **Dual-Layer Limits**: Off-chain deterministic rules *and* on-chain `perTxCap` / `dailyCap`. Even if an agent were compromised, on-chain contracts revert unauthorized transactions.
- **Malicious Document & Invoice Protection**: Attached invoices are safely scanned in an isolated sandbox and cannot trigger auto-execution.
- **Lookalike Address Defense**: Automatic detection of lookalike addresses compared against your trusted contacts.
- **Owner-Controlled Approvals**: The owner key remains securely in your browser; the assistant only prepares transaction data for your confirmation.
- **Permanent, Tamper-Proof Activity Log**: SHA-256 hash-chained transaction log with real-time verification status.
- **Emergency Freeze**: Instantly freeze all outgoing payments with a single click. Only your owner wallet can unfreeze.
- **Offline Practice Mode**: Runs fully offline with zero external keys or RPCs required for seamless demonstrations.

---

## Architecture

```
┌───────────────────────────────────────┐
│     Next.js Spatial Bento UI          │ ── chat + invoices ──► ┌───────────────────────────────────────┐
│  • Three.js 3D Core                   │                        │            Agent Service              │
│  • WCAG AA Light & Dark Themes        │ ◄── decisions + logs ── │  ingest → planner → risk → policy     │
│  • GSAP Motion & Lenis Scroll         │                        │     │            │        │           │
│  • Wagmi Injected Owner Wallet        │                        │     │      simulation ────┘           │
└──────────────────┬────────────────────┘                        └─────┼─────────────────────────────────┘
                   │ ownerTransfer (High value / New payees)           │ transferToken (Within allowance)
                   ▼                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        GuardianVault (Base Sepolia Smart Contract)                                     │
│  • Verified payees  ·  Single payment cap  ·  Daily spending allowance  ·  Replay protection          │
│  • MockUSDC (6 decimals)                                                                               │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Security Boundaries:**
- The AI model only proposes structured transfer intents and holds zero private keys.
- The policy engine operates on deterministic rules, never raw LLM output.
- The smart contract vault independently verifies all limits and allowances on-chain.
- The owner's private key never leaves the user's browser.

Full technical documentation: [docs/technical-documentation.md](docs/technical-documentation.md).

---

## Quick Start

### 1. Prerequisites
- Node 20+ (Node 22+ recommended)
- Foundry (`forge`) for smart contract testing (optional for live deployment)

### 2. Installation
```bash
npm run install:all
```

### 3. Run Locally (Practice Mode, No API Keys Needed)
```bash
npm run dev:agent     # Backend agent service (http://localhost:8787)
npm run dev:web       # Next.js web application (http://localhost:3000)
npm run seed          # (Optional) Seed practice demo payments
```

Open `http://localhost:3000` to interact with the Spatial Bento Grid, toggle Light/Dark mode, test invoice prompts, and watch the 3D Vault Core update in real-time.

### 4. Run on Base Sepolia Testnet
```bash
cp .env.example .env      # Fill DEPLOYER_PK, AGENT_PK, OWNER_ADDRESS, RPC_URL

cd contracts
forge install foundry-rs/forge-std OpenZeppelin/openzeppelin-contracts
forge test -vv
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast
```

Then configure the vault allowances as owner:
```bash
cast send $VAULT_ADDRESS "setToken(address,bool,uint256,uint256)" $USDC_ADDRESS true 50000000 150000000 --rpc-url $RPC_URL
cast send $VAULT_ADDRESS "setRecipient(address,bool)" $TUITION_ADDRESS true --rpc-url $RPC_URL
cast send $VAULT_ADDRESS "setRecipient(address,bool)" $RAHIM_ADDRESS true --rpc-url $RPC_URL
```

---

## Configuration

| Environment Variable | Default | Purpose |
|---|---|---|
| `RPC_URL` | `https://sepolia.base.org` | Base Sepolia RPC endpoint |
| `CHAIN_ID` | `84532` | Base Sepolia Chain ID |
| `EXPLORER` | `https://sepolia.basescan.org` | Block explorer base URL |
| `OWNER_ADDRESS` | `0x00...` | Owner address (read-only in UI, signs via browser) |
| `AGENT_PK` | — | Hot key for auto-approved payments within limits |
| `VAULT_ADDRESS` | empty | Deployed vault address (empty = Practice Mode) |
| `USDC_ADDRESS` | Base Sepolia MockUSDC | Token contract address |
| `ANTHROPIC_API_KEY` | empty | Anthropic API key (empty = Safe Preset Planner) |
| `PORT` | `8787` | Agent service port |
| `WEB_ORIGIN` | `http://localhost:3000` | Web frontend origin |
| `PER_TX_CAP` | `50000000` | Single payment limit (50 USDC) |
| `DAILY_CAP` | `150000000` | Daily allowance (150 USDC) |

---

## Protection Tiers

| Protection Tier | Condition | System Action |
|---|---|---|
| **BLOCKED BY RULES** | Vault frozen · Unapproved token · Lookalike address · Risk ≥ 0.7 | Payment blocked immediately. |
| **PROPOSAL ONLY** | Untrusted document with suspicious pattern · Caution mode | Shown as informational proposal; never executed automatically. |
| **APPROVAL NEEDED** | New recipient · Exceeds single limit · Exceeds daily allowance | Queued for owner confirmation in browser via wallet. |
| **AUTO-APPROVED** | Trusted payee · Within all allowances · Low risk | Executed automatically by assistant key. |
| **READ-ONLY QUERY** | Balance check · Rule query | Assistant answers without moving funds. |

---

## Testing & Quality Assurance

```bash
# Smart Contracts — 31 Foundry tests (28 unit + 3 fuzzing @ 256 runs each)
npm run test:contracts
# or directly: cd contracts && forge test -vv

# Agent Service — 41 Vitest unit & integration tests
npm test

# Adversarial Attack Suite — 14 real-world test cases (All Passed)
npm run attacks

# Web Application Production Build & Typecheck
cd web && npm run build
```

---

## Project Structure

```
contracts/   Foundry project: GuardianVault, MockUSDC, tests, deploy scripts
agent/       Fastify service: Intent parsing, risk evaluation, rule verification
web/         Next.js web app: Spatial Bento Grid, Three.js 3D Core, WCAG AA Themes
  app/       Next.js App Router (page.tsx, layout.tsx, globals.css, manifest.ts)
  components/
    bento/   Bento grid cards (Vault, Spending Rules, Trusted Payees, Protection)
    three/   Three.js 3D interactive holographic vault core
    ui/      BeautifulLoader, Skeleton, and Toast notification systems
attacks/     14-case adversarial attack verification suite
demo/        Invoices, sample documents, seed scripts
docs/        Technical documentation, security self-assessment, architecture specs
```

---

## License

MIT — see [LICENSE](LICENSE).
