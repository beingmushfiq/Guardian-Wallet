'use client';

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useSendTransaction, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { short } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { Wallet, LogOut, ArrowRightLeft, Loader2, CheckCircle2 } from 'lucide-react';

export function ConnectBar({ owner }: { owner: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const toast = useToast();

  const [simulatedAddress, setSimulatedAddress] = useState<string | null>(null);

  const injectedConnector = connectors[0];
  const activeAddress: string = (isConnected && address ? address : simulatedAddress) ?? '';
  const activeConnected = Boolean((isConnected && address) || simulatedAddress);

  const handleConnect = async () => {
    const demoOwner =
      owner && owner !== '0x0000000000000000000000000000000000000000'
        ? owner
        : '0x0000000000000000000000000000000000000001';

    // 1. Try real injected wallet if present in the browser
    if (injectedConnector && typeof window !== 'undefined' && (window as unknown as { ethereum?: unknown }).ethereum) {
      try {
        const res = await connectAsync({ connector: injectedConnector });
        if (res?.accounts?.[0]) {
          toast.success('Wallet Connected', `Connected to Web3 provider (${short(res.accounts[0], 4)}).`);
          return;
        }
      } catch (err) {
        console.warn('Real wallet connection failed or dismissed, falling back to simulated owner wallet:', err);
      }
    }

    // 2. Connect as simulated owner for testing/demo
    setSimulatedAddress(demoOwner);
    toast.success('Owner Wallet Connected', `Connected as ${short(demoOwner, 6)} (Practice Mode)`);
  };

  const handleDisconnect = () => {
    if (isConnected) {
      disconnect();
    }
    setSimulatedAddress(null);
    toast.info('Wallet Disconnected', 'Switched back to observer mode.');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isConnected && chainId !== baseSepolia.id && (
        <button
          className="btn-ghost !border-amber-400/40 !bg-amber-500/10 text-amber-700 dark:text-amber-300 !py-2 !px-3 text-xs font-semibold"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          <span>Switch Network</span>
        </button>
      )}

      {activeConnected ? (
        <button
          className="btn-ghost !py-2 !px-3.5 text-xs font-mono font-bold border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:border-rose-400 hover:text-rose-500 transition-all"
          onClick={handleDisconnect}
          title={activeAddress || undefined}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulseSoft" />
          <span>{activeAddress ? short(activeAddress, 4) : 'Connected'}</span>
          <LogOut className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
        </button>
      ) : (
        <button
          className="btn-primary !py-2 !px-4 text-xs font-bold tracking-tight shadow-md hover:scale-[1.02] active:scale-95 transition-all"
          disabled={isPending}
          onClick={handleConnect}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wallet className="h-3.5 w-3.5" />
          )}
          <span>Connect Owner Wallet</span>
        </button>
      )}
    </div>
  );
}

/** Sends the owner-signed ownerTransfer call. Only used in live mode. */
export function useOwnerSigner() {
  const { sendTransactionAsync } = useSendTransaction();
  return async (call: { to: `0x${string}`; data: `0x${string}`; value: '0'; chainId: number }) => {
    const hash = await sendTransactionAsync({
      to: call.to,
      data: call.data,
      value: 0n,
      chainId: call.chainId,
    });
    return hash;
  };
}

export function OwnerNotice({ owner }: { owner: string }) {
  return (
    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-ink-400 font-medium">
      The AI assistant can only send payments that comply with your rules. It can never raise limits,
      add payees, or unfreeze funds. Owner Wallet: <span className="font-mono text-slate-900 dark:text-ink-200 font-bold">{short(owner, 6)}</span>
    </p>
  );
}
