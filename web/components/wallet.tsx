'use client';

import { useAccount, useConnect, useDisconnect, useSendTransaction, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { short } from '@/lib/api';
import { Wallet, LogOut, ArrowRightLeft, Loader2 } from 'lucide-react';

export function ConnectBar({ owner }: { owner: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const injectedConnector = connectors[0];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {isConnected && chainId !== baseSepolia.id && (
        <button
          className="btn-ghost !border-amber-500/40 !bg-amber-50 !text-amber-900 dark:!bg-amber-400/10 dark:!text-amber-300 !py-1.5 text-xs font-bold"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
        >
          <ArrowRightLeft className="h-3 w-3" />
          <span>Switch Network</span>
        </button>
      )}

      {isConnected ? (
        <button
          className="btn-ghost !py-1.5 text-xs font-mono font-bold"
          onClick={() => disconnect()}
          title={address}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span>{short(address, 4)}</span>
          <LogOut className="h-3 w-3 text-slate-500 hover:text-rose-600 dark:text-ink-400 dark:hover:text-rose-400" />
        </button>
      ) : (
        <button
          className="btn-ghost !py-1.5 text-xs font-bold"
          disabled={isPending || !injectedConnector}
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-lime-400" />
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
