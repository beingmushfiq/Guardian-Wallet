// app.js — cPanel Passenger Application Entrypoint
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
