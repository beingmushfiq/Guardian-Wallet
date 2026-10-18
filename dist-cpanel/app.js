// app.js — Resilient cPanel Phusion Passenger Gateway
// Subdomain: guardianwallet.devcenterpoint.com

const http = require('http');
const net = require('net');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const logFile = path.join(__dirname, 'cpanel-debug.log');
function log(msg) {
  const line = '[' + new Date().toISOString() + '] ' + msg + '\n';
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
    for (const l of raw.split('\n')) {
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
