import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
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

// Sanitize server.js: replace hardcoded local absolute paths with '.' so it resolves cleanly on Linux
const serverJsTarget = path.join(webOut, 'server.js');
if (existsSync(serverJsTarget)) {
  let sjs = readFileSync(serverJsTarget, 'utf8');
  sjs = sjs.split('D:\\\\Guardian Wallet (Fintechathon)\\\\web').join('.');
  sjs = sjs.split('D:\\Guardian Wallet (Fintechathon)\\web').join('.');
  writeFileSync(serverJsTarget, sjs, 'utf8');
}

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

// 6. Write Root app.js (The cPanel Phusion Passenger Resilient Gateway)
console.log('📝 Generating resilient cPanel entrypoint app.js...');
const appJsContent = `// app.js — Resilient cPanel Phusion Passenger Gateway
// Subdomain: guardianwallet.devcenterpoint.com

const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const logFile = path.join(__dirname, 'cpanel-debug.log');
function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\\n';
  try {
    fs.appendFileSync(logFile, line);
  } catch (_) {}
  console.log(msg);
}

log('[Boot] Initializing Guardian Wallet on cPanel Passenger...');
log('[Boot] Node version: ' + process.version + ' (' + process.arch + ')');
log('[Boot] process.env.PORT provided by environment: ' + process.env.PORT);
log('[Boot] PhusionPassenger global detected: ' + (typeof PhusionPassenger !== 'undefined'));

// Load .env variables into process.env if present
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  try {
    const raw = fs.readFileSync(envFile, 'utf8');
    for (const l of raw.split('\\n')) {
      const line = l.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq > 0) {
        const k = line.slice(0, eq).trim();
        const v = line.slice(eq + 1).trim();
        if (k && !process.env[k]) {
          process.env[k] = v;
        }
      }
    }
  } catch (_) {}
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
};

function serveStaticFile(res, filePath, isImmutable) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': isImmutable
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600',
  });
  fs.createReadStream(filePath).pipe(res);
}

// Dynamically allocate free local ephemeral ports to guarantee zero collision
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function main() {
  let nextPort, agentPort;
  try {
    nextPort = await getFreePort();
    agentPort = await getFreePort();
  } catch (e) {
    log('[Boot Warning] Dynamic internal port allocation failed, using defaults: ' + e.message);
    nextPort = 31234;
    agentPort = 31235;
  }

  log('[Boot] Allocated internal ports -> Next.js: ' + nextPort + ', Agent: ' + agentPort);

  // 1. Launch Agent Fastify Backend
  const agentScript = path.join(__dirname, 'agent', 'dist', 'server.js');
  log('[Boot] Spawning Agent backend from: ' + agentScript);
  const agentProcess = spawn(process.execPath, [agentScript], {
    cwd: path.join(__dirname, 'agent'),
    env: {
      ...process.env,
      PORT: String(agentPort),
      HOST: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'pipe',
  });

  agentProcess.stdout?.on('data', (d) => log('[Agent stdout] ' + d.toString().trim()));
  agentProcess.stderr?.on('data', (d) => log('[Agent stderr] ' + d.toString().trim()));
  agentProcess.on('exit', (code, sig) => log('[Agent exited] code=' + code + ', signal=' + sig));

  // 2. Launch Next.js Standalone Frontend
  const nextScript = path.join(__dirname, 'web', 'server.js');
  log('[Boot] Spawning Next.js frontend from: ' + nextScript);
  const nextProcess = spawn(process.execPath, [nextScript], {
    cwd: path.join(__dirname, 'web'),
    env: {
      ...process.env,
      PORT: String(nextPort),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      AGENT_URL: 'http://127.0.0.1:' + agentPort,
    },
    stdio: 'pipe',
  });

  nextProcess.stdout?.on('data', (d) => log('[Next stdout] ' + d.toString().trim()));
  nextProcess.stderr?.on('data', (d) => log('[Next stderr] ' + d.toString().trim()));
  nextProcess.on('exit', (code, sig) => log('[Next exited] code=' + code + ', signal=' + sig));

  process.on('exit', () => {
    try { agentProcess.kill(); } catch (_) {}
    try { nextProcess.kill(); } catch (_) {}
  });

  // 3. Create Passenger Gateway HTTP Server
  const server = http.createServer((req, res) => {
    const cleanUrl = (req.url || '/').split('?')[0];

    // Direct static serving for Next.js assets (_next/static/...)
    if (cleanUrl.startsWith('/_next/static/')) {
      const rel = cleanUrl.slice('/_next/static/'.length);
      const filePath = path.join(__dirname, 'web', '.next', 'static', rel);
      const safeDir = path.join(__dirname, 'web', '.next', 'static');
      if (filePath.startsWith(safeDir) && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return serveStaticFile(res, filePath, true);
      }
    }

    // Direct static serving for public assets (/icon.svg, /favicon.ico, etc.)
    if (cleanUrl !== '/') {
      const rel = cleanUrl.replace(/^\\/+/, '');
      const publicPath = path.join(__dirname, 'web', 'public', rel);
      const safeDir = path.join(__dirname, 'web', 'public');
      if (publicPath.startsWith(safeDir) && fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
        return serveStaticFile(res, publicPath, false);
      }
    }

    // Proxy API routes to Agent, everything else to Next.js
    const isApi = req.url.startsWith('/api/');
    const targetPort = isApi ? agentPort : nextPort;

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          'x-forwarded-for': req.socket.remoteAddress || '',
          'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'https',
        },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      log('[Gateway Proxy Wait -> ' + (isApi ? 'Agent' : 'Next') + '] ' + err.message);
      if (isApi) {
        res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '2' });
        res.end(JSON.stringify({ ok: false, error: 'Service is warming up, please retry shortly...' }));
      } else {
        // Return 200 during warm-up so Apache / LiteSpeed reverse proxy never replaces it with generic error page
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        });
        res.end(
          '<!DOCTYPE html>' +
          '<html>' +
          '<head>' +
            '<meta charset="utf-8">' +
            '<meta http-equiv="refresh" content="2">' +
            '<title>Guardian Wallet — Warming up</title>' +
            '<style>' +
              'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #070913; color: #fff; }' +
              '.box { text-align: center; padding: 2.5rem 3rem; border: 1px solid rgba(255,255,255,0.12); border-radius: 1.25rem; background: rgba(255,255,255,0.04); backdrop-filter: blur(12px); max-width: 440px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }' +
              'h1 { font-size: 1.4rem; margin: 0.75rem 0 0.5rem; color: #a3e635; font-weight: 700; letter-spacing: -0.02em; }' +
              'p { font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin: 0; }' +
              '.sub { font-size: 11px; color: #64748b; margin-top: 0.5rem; display: block; }' +
              '.spinner { width: 40px; height: 40px; border: 3px solid rgba(163,230,53,0.2); border-top-color: #a3e635; border-radius: 50%; margin: 0 auto; animation: spin 0.8s linear infinite; }' +
              '@keyframes spin { to { transform: rotate(360deg); } }' +
            '</style>' +
          '</head>' +
          '<body>' +
            '<div class="box">' +
              '<div class="spinner"></div>' +
              '<h1>Guardian Wallet</h1>' +
              '<p>Autonomous Dual-Layer Security Engine warming up on server.<br><span class="sub">Connecting to local nodes... refreshing automatically in 2s</span></p>' +
            '</div>' +
          '</body>' +
          '</html>'
        );
      }
    });

    req.pipe(proxyReq, { end: true });
  });

  // 4. Defensive listen error handling
  server.on('error', (err) => {
    log('[Gateway Server Error] ' + (err.stack || err.message));
    if (err.code === 'EADDRINUSE') {
      log('[Gateway Recovery] Port conflict detected. Rebinding to dynamic available port (0)...');
      try {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          log('[Boot Complete] Gateway server successfully recovered on dynamic port: ' + (addr && addr.port ? addr.port : JSON.stringify(addr)));
        });
      } catch (recErr) {
        log('[Gateway Fatal] Dynamic port fallback failed: ' + recErr.message);
      }
    }
  });

  // 5. Intelligent binding: Passenger socket, PORT env, or dynamic CLI port
  if (typeof PhusionPassenger !== 'undefined') {
    log('[Boot] Detected PhusionPassenger runtime -> binding to "passenger" socket...');
    server.listen('passenger', () => {
      log('[Boot Complete] Gateway server successfully attached to Phusion Passenger socket!');
    });
  } else if (process.env.PORT) {
    log('[Boot] Binding to process.env.PORT: ' + process.env.PORT);
    server.listen(process.env.PORT, () => {
      log('[Boot Complete] Gateway server successfully listening on Passenger PORT: ' + process.env.PORT);
    });
  } else {
    getFreePort().then((cliPort) => {
      log('[Boot] No Passenger env detected (CLI/Terminal mode) -> binding to free port: ' + cliPort);
      server.listen(cliPort, '127.0.0.1', () => {
        log('[Boot Complete] Gateway server successfully listening on http://127.0.0.1:' + cliPort);
      });
    }).catch(() => {
      log('[Boot] Fallback -> binding to port 0...');
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        log('[Boot Complete] Gateway server listening on dynamic port: ' + (addr && addr.port ? addr.port : 0));
      });
    });
  }
}

main().catch((err) => {
  log('[Fatal Gateway Error] ' + (err.stack || err.message));
});
`;
writeFileSync(path.join(outDir, 'app.js'), appJsContent, 'utf8');

// 7. Write Root package.json
const rootPkg = {
  name: 'guardian-wallet-cpanel',
  version: '1.0.0',
  private: true,
  main: 'app.js',
  scripts: {
    start: 'node app.js',
  },
  dependencies: {
    next: '^16.4.2',
  },
};
writeFileSync(path.join(outDir, 'package.json'), JSON.stringify(rootPkg, null, 2), 'utf8');

// 8. Write .env template
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

// 9. Compress into guardianwallet-cpanel.zip
console.log('🗜️  Compressing into guardianwallet-cpanel.zip...');
const zipFile = path.join(rootDir, 'guardianwallet-cpanel.zip');
if (existsSync(zipFile)) {
  rmSync(zipFile, { force: true });
}
execSync('powershell -Command "Compress-Archive -Path dist-cpanel/* -DestinationPath guardianwallet-cpanel.zip -Force"', { cwd: rootDir, stdio: 'inherit' });

console.log('✅ Deployment bundle successfully created and zipped at guardianwallet-cpanel.zip!');
