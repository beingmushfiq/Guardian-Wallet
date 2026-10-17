import path from 'node:path';
import dotenv from 'dotenv';
import type { Address, Contact, TokenInfo } from './types.js';

// Load repo-root .env first, then agent/.env (agent wins if both exist).
dotenv.config({ path: path.resolve(process.cwd(), '../.env'), quiet: true });
dotenv.config({ quiet: true });

const num = (v: string | undefined, fallback: number) => (v === undefined || v === '' ? fallback : Number(v));
const addr = (v: string | undefined, fallback: string) => (v && /^0x[0-9a-fA-F]{40}$/.test(v) ? v : fallback) as Address;

export const config = {
  port: num(process.env.PORT, 8787),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',

  chainId: num(process.env.CHAIN_ID, 84532),
  rpcUrl: process.env.RPC_URL ?? 'https://sepolia.base.org',
  explorer: process.env.EXPLORER ?? 'https://sepolia.basescan.org',

  vaultAddress: (process.env.VAULT_ADDRESS ?? '') as Address | '',
  usdcAddress: addr(process.env.USDC_ADDRESS, '0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
  ownerAddress: addr(process.env.OWNER_ADDRESS, '0x0000000000000000000000000000000000000001'),
  agentPk: process.env.AGENT_PK ?? '',

  token: {
    symbol: 'USDC',
    address: addr(process.env.USDC_ADDRESS, '0x036CbD53842c5426634e7929541eC2318f3dCF7e'),
    decimals: 6,
  } as TokenInfo,

  perTxCap: BigInt(process.env.PER_TX_CAP ?? '50000000'),
  dailyCap: BigInt(process.env.DAILY_CAP ?? '150000000'),

  contacts: [
    {
      name: 'Tuition Office',
      address: addr(process.env.RECIPIENT_TUITION, '0x7a0000000000000000000000000000000000c0de'),
      allowlisted: true,
    },
    {
      name: 'Rahim',
      address: addr(process.env.RECIPIENT_RAHIM, '0x2b0000000000000000000000000000000000beef'),
      allowlisted: true,
    },
  ] as Contact[],

  auditFile: process.env.AUDIT_FILE ?? path.resolve(process.cwd(), 'audit.jsonl'),
  dbFile: process.env.AGENT_DB ?? path.resolve(process.cwd(), 'guardian.db'),

  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5',

  safety: {
    blocksForSafetyMode: 3,
    blocksWindowMs: 10 * 60 * 1000,
    safetyModeDurationMs: 30 * 60 * 1000,
    blocksForAutoPause: 5,
  },
};

export function isLiveMode(): boolean {
  return Boolean(config.vaultAddress && config.agentPk);
}

export function explorerTx(hash: string): string {
  return `${config.explorer}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${config.explorer}/address/${address}`;
}
