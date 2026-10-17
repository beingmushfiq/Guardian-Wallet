'use client';

import { useAccount, useConnect, useDisconnect, useSendTransaction, useSwitchChain } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { short } from '@/lib/api';

export function ConnectBar({ owner }: { owner: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const injectedConnector = connectors[0];

  return (
    <div className="flex items-center gap-2">
      {isConnected && chainId !== baseSepolia.id && (
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => switchChain({ chainId: baseSepolia.id })}>
          Switch to Base Sepolia
        </button>
      )}
      {isConnected ? (
        <button className="btn-ghost !py-1.5 text-xs" onClick={() => disconnect()} title={address}>
          <span className="h-1.5 w-1.5 rounded-full bg-mint" />
          {short(address)} · disconnect
        </button>
      ) : (
        <button
          className="btn-ghost !py-1.5 text-xs"
          disabled={isPending || !injectedConnector}
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
        >
          Connect owner wallet
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
    <p className="text-[11px] leading-relaxed text-ink-400">
      The agent key can spend only inside policy and can pause. It cannot change recipients, raise limits,
      or unpause. Owner: <span className="font-mono text-ink-300">{short(owner, 6)}</span>
    </p>
  );
}
