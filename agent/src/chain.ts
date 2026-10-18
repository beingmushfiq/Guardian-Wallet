import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  parseEventLogs,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { ERC20_ABI, VAULT_ABI } from './abi.js';
import { config } from './config.js';
import { readSimLedger, writeSimLedger } from './store.js';
import type { Address, ExecutionResult, Proposal, SimulationResult, Venue, VenueState } from './types.js';

const ZERO = '0x0000000000000000000000000000000000000000' as Address;

// ---------------------------------------------------------------------------
// Simulated venue — identical rules to the contract, no keys, no network.
// Used when VAULT_ADDRESS/AGENT_PK are absent so the whole product is runnable
// offline. It is clearly labelled "simulated" everywhere in the UI/audit log.
// ---------------------------------------------------------------------------
export class SimulatedVenue implements Venue {
  readonly mode = 'simulated' as const;
  private readonly initialBalance: bigint;

  constructor(initialBalance = 1_000_000_000n) {
    this.initialBalance = initialBalance;
  }

  async readState(): Promise<VenueState> {
    const l = readSimLedger(this.initialBalance);
    const windowExpired = Math.floor(Date.now() / 1000) >= l.windowStart + 86_400;
    return {
      paused: l.paused,
      balance: l.balance,
      spentToday: windowExpired ? 0n : l.spent,
      perTxCap: l.perTxCap ?? config.perTxCap,
      dailyCap: l.dailyCap ?? config.dailyCap,
      recipientAllowlist: new Set(config.contacts.filter((c) => c.allowlisted).map((c) => c.address.toLowerCase())),
      tokenAllowlist: new Set([config.token.address.toLowerCase()]),
    };
  }

  async isContract(): Promise<boolean> {
    return false;
  }

  async simulate(p: Proposal): Promise<SimulationResult> {
    if (p.amount <= 0n) return { ok: false, error: 'ZeroAmount: amount must be greater than zero' };
    if (p.to.toLowerCase() === ZERO.toLowerCase()) return { ok: false, error: 'InvalidRecipient: zero address' };
    const state = await this.readState();
    if (state.paused) return { ok: false, error: 'IsPaused: wallet is paused' };
    if (!state.tokenAllowlist.has(p.token.toLowerCase())) return { ok: false, error: 'NotAllowed: token' };
    if (!state.recipientAllowlist.has(p.to.toLowerCase())) return { ok: false, error: 'NotAllowed: recipient' };
    if (p.amount > state.perTxCap) return { ok: false, error: 'OverPerTxCap' };
    if (state.spentToday + p.amount > state.dailyCap) return { ok: false, error: 'OverDailyCap' };
    if (state.balance < p.amount) return { ok: false, error: 'ERC20InsufficientBalance' };
    return { ok: true };
  }

  async transfer(p: Proposal): Promise<ExecutionResult> {
    const l = readSimLedger(this.initialBalance);
    const res = await this.simulate(p);
    if (!res.ok) throw new Error(res.error ?? 'simulation failed');
    if (Math.floor(Date.now() / 1000) >= l.windowStart + 86_400) {
      l.windowStart = Math.floor(Date.now() / 1000);
      l.spent = 0n;
    }
    l.spent += p.amount;
    l.balance -= p.amount;
    writeSimLedger(l);
    return { hash: fakeHash(p.intentId), mode: 'simulated', simulated: true };
  }

  async pause(): Promise<ExecutionResult> {
    const l = readSimLedger(this.initialBalance);
    l.paused = true;
    writeSimLedger(l);
    return { hash: fakeHash(`pause-${Date.now()}`), mode: 'simulated', simulated: true };
  }

  ownerTransferCall(p: Proposal) {
    return {
      to: config.vaultAddress || ZERO,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'ownerTransfer',
        args: [p.intentId, p.token, p.to, p.amount],
      }),
      value: '0' as const,
      chainId: config.chainId,
    };
  }

  async verifyOwnerTransfer(): Promise<{ ok: boolean; error?: string }> {
    return { ok: false, error: 'Owner verification is only available in live mode.' };
  }

  async simulatedOwnerTransfer(p: Proposal): Promise<ExecutionResult> {
    if (p.amount <= 0n) throw new Error('ZeroAmount: amount must be greater than zero');
    if (p.to.toLowerCase() === ZERO.toLowerCase()) throw new Error('InvalidRecipient: zero address');
    const l = readSimLedger(this.initialBalance);
    if (l.balance < p.amount) throw new Error('ERC20InsufficientBalance');
    l.balance -= p.amount;
    writeSimLedger(l);
    return { hash: fakeHash(p.intentId), mode: 'simulated', simulated: true };
  }
}

function fakeHash(seed: string): `0x${string}` {
  // Deterministic, obviously-not-a-real-chain-hash placeholder for simulated mode.
  const hex = Buffer.from(seed).toString('hex').padEnd(64, '0').slice(0, 64);
  return `0x${hex}` as `0x${string}`;
}

// ---------------------------------------------------------------------------
// Live venue — GuardianVault on Base Sepolia (or any EVM chain via RPC_URL).
// ---------------------------------------------------------------------------
export class LiveVenue implements Venue {
  readonly mode = 'live' as const;
  private readonly vault = config.vaultAddress as Address;
  private readonly account;
  private readonly publicClient;
  private readonly walletClient;

  constructor() {
    if (!config.agentPk) throw new Error('AGENT_PK is required for live mode');
    const account = privateKeyToAccount(config.agentPk as `0x${string}`);
    this.account = account;
    this.publicClient = createPublicClient({ chain: baseSepolia, transport: http(config.rpcUrl) });
    this.walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(config.rpcUrl) });
  }

  async readState(): Promise<VenueState> {
    const token = config.token.address;
    const [paused, spent, start, balance, perTxCap, dailyCap, tokenAllowed, ...recipientFlags] = await Promise.all([
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'paused' }),
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'spentInWindow', args: [token] }),
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'windowStart', args: [token] }),
      this.publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: 'balanceOf', args: [this.vault] }),
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'perTxCap', args: [token] }),
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'dailyCap', args: [token] }),
      this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'tokenOk', args: [token] }),
      ...config.contacts.map((c) =>
        this.publicClient.readContract({ address: this.vault, abi: VAULT_ABI, functionName: 'recipientOk', args: [c.address] }),
      ),
    ]);

    const windowExpired = BigInt(Math.floor(Date.now() / 1000)) >= start + 86_400n;
    const recipientAllowlist = new Set<string>();
    config.contacts.forEach((c, i) => {
      if (recipientFlags[i]) recipientAllowlist.add(c.address.toLowerCase());
    });

    return {
      paused,
      balance,
      spentToday: windowExpired ? 0n : spent,
      perTxCap,
      dailyCap,
      recipientAllowlist,
      tokenAllowlist: new Set(tokenAllowed ? [token.toLowerCase()] : []),
    };
  }

  async isContract(address: Address): Promise<boolean> {
    const code = await this.publicClient.getBytecode({ address });
    return Boolean(code && code !== '0x');
  }

  async simulate(p: Proposal): Promise<SimulationResult> {
    try {
      await this.publicClient.simulateContract({
        account: this.account,
        address: this.vault,
        abi: VAULT_ABI,
        functionName: 'transferToken',
        args: [p.intentId, p.token, p.to, p.amount],
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.shortMessage ?? e?.message ?? String(e) };
    }
  }

  async transfer(p: Proposal): Promise<ExecutionResult> {
    const hash = await this.walletClient.writeContract({
      address: this.vault,
      abi: VAULT_ABI,
      functionName: 'transferToken',
      args: [p.intentId, p.token, p.to, p.amount],
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return { hash, mode: 'live' };
  }

  async pause(): Promise<ExecutionResult> {
    const hash = await this.walletClient.writeContract({
      address: this.vault,
      abi: VAULT_ABI,
      functionName: 'emergencyPause',
    });
    await this.publicClient.waitForTransactionReceipt({ hash });
    return { hash, mode: 'live' };
  }

  ownerTransferCall(p: Proposal) {
    return {
      to: this.vault,
      data: encodeFunctionData({
        abi: VAULT_ABI,
        functionName: 'ownerTransfer',
        args: [p.intentId, p.token, p.to, p.amount],
      }),
      value: '0' as const,
      chainId: config.chainId,
    };
  }

  async verifyOwnerTransfer(intentId: `0x${string}`, txHash: `0x${string}`): Promise<{ ok: boolean; error?: string }> {
    try {
      const receipt = await this.publicClient.getTransactionReceipt({ hash: txHash as Hex });
      if (receipt.status !== 'success') return { ok: false, error: 'Transaction reverted on-chain.' };
      const logs = parseEventLogs({ abi: VAULT_ABI, eventName: 'OwnerTransfer', logs: receipt.logs });
      const match = logs.find(
        (l) => l.args.intentId === intentId && l.address.toLowerCase() === this.vault.toLowerCase(),
      );
      if (!match) return { ok: false, error: 'No verified OwnerTransfer event from the vault for this intent in the transaction.' };
      if (receipt.from.toLowerCase() !== config.ownerAddress.toLowerCase()) {
        return { ok: false, error: 'Transaction was not sent by the configured owner address.' };
      }
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.shortMessage ?? e?.message ?? String(e) };
    }
  }

  async simulatedOwnerTransfer(): Promise<ExecutionResult> {
    throw new Error('Owner transfers must be signed by the owner wallet in live mode.');
  }
}

export function createVenue(): Venue {
  return config.vaultAddress && config.agentPk ? new LiveVenue() : new SimulatedVenue();
}
