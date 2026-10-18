# Guardian Wallet

**Spend with intent, not blind trust.**

Guardian Wallet is an autonomous AI wallet agent with *enforced* policy boundaries. You speak in natural language ("Pay tuition $40"), the assistant evaluates intent, a deterministic policy engine validates security rules, and a smart contract vault enforces daily spending allowances and trusted payees before funds can move. A compromised AI model, a malicious prompt injection, or a lookalike address cannot override your spending limits.

Built for the Fintechathon on Base Sepolia (chain ID 84532).

---

## ✨ Web UI & Design System

Guardian Wallet features a **Spatial Bento Grid UI** designed according to strict **Antigravity Design** principles and **WCAG AA 100% accessible contrast**:

- **Interactive 3D Three.js Vault Core** (`web/components/three/vault-scene-3d.tsx`):
  - A real-time rotating crystalline polyhedron with an inner cryptographic nucleus and orbiting particle rings.
  - Dynamically shifts lighting and colors to mirror vault status: **Emerald/Lime** (Secure), **Amber** (Personal Approval Needed), and **Crimson** (Emergency Frozen).
- **Spatial Glass Surfaces & Specular Glare** (`web/components/spatial-card.tsx`):
  - Multi-layer frosted glass panels with cursor-following radial spotlight reflections and stable, non-tilting planar orientation.
- **Light & Dark Theme Engine** (`web/components/theme-provider.tsx`):
  - One-click Theme Toggler (Sun / Moon) with seamless persistence via `localStorage`.
  - **100% WCAG AA Compliance**: High-contrast text (> 14:1 for primary titles, > 5:1 for body and labels in both light and dark modes).
- **Custom Toast Notification System** (`web/components/ui/toast.tsx`):
  - Multi-type glassmorphic alerts (Success, Warning, Error, Info) with auto-dismiss progress countdown timers and tactile micro-animations.
- **Shimmering Skeleton Loaders & Dual-Ring Spinner** (`web/components/ui/skeleton.tsx`, `web/components/ui/loader.tsx`):
  - Instant perceived performance with skeleton layouts and cryptographic orbital loaders.
- **Human-First, De-Jargonized Copy**:
  - Replaces intimidating blockchain and cryptography terms with reassuring, intuitive financial language ("Protected Vault", "Daily Allowance", "Trusted Payees", "Protection Guarantees", "Invoice Scanner").
- **Motion Choreography & Fluid Scrolling**:
  - GSAP timeline reveals with spring physics.
  - Lenis inertial scrolling across conversation logs and activity history.
- **Progressive Web App (PWA) & Custom Branding**:
  - Bespoke vector shield emblem in `/logo.svg`.
  - SVG favicon, Apple touch icons, and web manifest (`app/manifest.ts`).

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
# Contracts — 25 tests (22 unit + 3 fuzzing)
npm run test:contracts

# Agent Service — 35 tests
npm test

# Adversarial Attack Suite — 14 real-world test cases
npm run attacks

# Web Application Production Build
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
