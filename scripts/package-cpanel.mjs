import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'dist-cpanel');

console.log('🚀 Packaging Guardian Wallet for cPanel deployment...');
console.log(`Target subdomain: guardianwallet.devcenterpoint.com`);

// 1. Clean previous bundle
if (existsSync(outDir)) {
  console.log('🧹 Cleaning old dist-cpanel directory...');
  rmSync(outDir, { recursive: true, force: true });
}
mkdirSync(outDir, { recursive: true });

// 2. Build Agent
console.log('🔨 Building Agent TypeScript backend...');
execSync('npm --prefix agent run build', { cwd: rootDir, stdio: 'inherit' });

// 3. Build Web Next.js Frontend
console.log('🔨 Building Web Next.js standalone frontend...');
execSync('npm --prefix web run build', { cwd: rootDir, stdio: 'inherit' });

// 4. Assemble Web Directory
console.log('📦 Assembling Web Standalone distribution...');
const webOut = path.join(outDir, 'web');
mkdirSync(webOut, { recursive: true });

// Copy standalone output
const standaloneDir = path.join(rootDir, 'web', '.next', 'standalone');
cpSync(standaloneDir, webOut, { recursive: true });

// Copy static assets into standalone (.next/static and public)
const staticSrc = path.join(rootDir, 'web', '.next', 'static');
const staticDest = path.join(webOut, '.next', 'static');
mkdirSync(staticDest, { recursive: true });
cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(rootDir, 'web', 'public');
const publicDest = path.join(webOut, 'public');
mkdirSync(publicDest, { recursive: true });
cpSync(publicSrc, publicDest, { recursive: true });

// 5. Assemble Agent Directory
console.log('📦 Assembling Agent distribution...');
const agentOut = path.join(outDir, 'agent');
mkdirSync(agentOut, { recursive: true });

// Copy agent/dist
cpSync(path.join(rootDir, 'agent', 'dist'), path.join(agentOut, 'dist'), { recursive: true });

// Copy agent package.json
cpSync(path.join(rootDir, 'agent', 'package.json'), path.join(agentOut, 'package.json'));

// Copy agent node_modules (production deps)
const agentModules = path.join(rootDir, 'agent', 'node_modules');
if (existsSync(agentModules)) {
  console.log('📦 Copying Agent node_modules...');
  cpSync(agentModules, path.join(agentOut, 'node_modules'), { recursive: true });
}

// 6. Write Root app.js (The cPanel Phusion Passenger Entrypoint)
console.log('📝 Generating cPanel entrypoint app.js...');
const appJsContent = `// app.js — cPanel Passenger Application Entrypoint
// Domain: guardianwallet.devcenterpoint.com

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const AGENT_PORT = process.env.AGENT_PORT || '8787';
const PASSENGER_PORT = process.env.PORT || '3000';

console.log('[Guardian cPanel] Booting Guardian Wallet on cPanel...');

// 1. Launch Agent Backend (Fastify API + SQLite Store)
const agentScript = path.join(__dirname, 'agent', 'dist', 'server.js');
console.log('[Guardian cPanel] Starting Agent backend on port ' + AGENT_PORT + '...');

const agentProcess = spawn(process.execPath, [agentScript], {
  cwd: path.join(__dirname, 'agent'),
  env: {
    ...process.env,
    PORT: AGENT_PORT,
    HOST: '127.0.0.1',
    NODE_ENV: 'production',
  },
  stdio: 'inherit',
});

agentProcess.on('error', (err) => {
  console.error('[Guardian Agent Spawn Error]:', err);
});

agentProcess.on('exit', (code, signal) => {
  console.warn('[Guardian Agent Terminated]: code=' + code + ', signal=' + signal);
});

// Clean shutdown handlers
process.on('exit', () => {
  try { agentProcess.kill(); } catch (_) {}
});
process.on('SIGINT', () => {
  try { agentProcess.kill(); } catch (_) {}
  process.exit();
});
process.on('SIGTERM', () => {
  try { agentProcess.kill(); } catch (_) {}
  process.exit();
});

// 2. Launch Next.js Standalone Frontend on Passenger Port
process.env.PORT = PASSENGER_PORT;
process.env.HOSTNAME = '0.0.0.0';
process.env.NODE_ENV = 'production';
process.env.AGENT_URL = 'http://127.0.0.1:' + AGENT_PORT;

console.log('[Guardian cPanel] Launching Next.js frontend on port ' + PASSENGER_PORT + '...');
require('./web/server.js');
`;
writeFileSync(path.join(outDir, 'app.js'), appJsContent, 'utf8');

// 7. Write Root package.json
const rootPkg = {
  name: 'guardian-wallet-cpanel',
  version: '1.0.0',
  private: true,
  scripts: {
    start: 'node app.js',
  },
  dependencies: {
    next: '^16.4.2',
  },
};
writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(rootPkg, null, 2), 'utf8');

// 8. Write .env.production template
console.log('📝 Generating .env template...');
const envTemplate = `# Environment configuration for guardianwallet.devcenterpoint.com
# ---------------------------------------------------------------------------
# Network & Chain
# ---------------------------------------------------------------------------
RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
EXPLORER=https://sepolia.basescan.org

# ---------------------------------------------------------------------------
# Contracts (Leave VAULT_ADDRESS empty to run in safe SIMULATED mode)
# ---------------------------------------------------------------------------
VAULT_ADDRESS=
USDC_ADDRESS=

# ---------------------------------------------------------------------------
# Owner & Agent Keys (Optional in simulated mode)
# ---------------------------------------------------------------------------
OWNER_ADDRESS=
AGENT_PK=
AGENT_ADDRESS=

# ---------------------------------------------------------------------------
# AI Planner (Optional: leaving blank uses deterministic fallback planner)
# ---------------------------------------------------------------------------
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-5

# ---------------------------------------------------------------------------
# Storage paths
# ---------------------------------------------------------------------------
AUDIT_FILE=./audit.jsonl
AGENT_DB=./guardian.db

# ---------------------------------------------------------------------------
# Policy limits (Base units with 6 decimals: 50 USDC per tx, 150 USDC daily)
# ---------------------------------------------------------------------------
PER_TX_CAP=50000000
DAILY_CAP=150000000
`;
writeFileSync(path.join(outDir, '.env.production'), envTemplate, 'utf8');
writeFileSync(path.join(outDir, '.env'), envTemplate, 'utf8');

console.log('✅ Deployment bundle successfully created at dist-cpanel/');
