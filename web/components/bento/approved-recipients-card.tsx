'use client';

import { useState } from 'react';
import type { AgentState } from '@/lib/types';
import { short } from '@/lib/api';
import { SpatialCard } from '@/components/spatial-card';
import { useToast } from '@/components/ui/toast';
import { Users, Copy, Check, ShieldCheck } from 'lucide-react';

export function ApprovedRecipientsCard({ state }: { state: AgentState | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  const copyToClipboard = (address: string, name: string) => {
    navigator.clipboard.writeText(address);
    setCopied(address);
    toast.info('Address Copied', `Copied ${name}'s address to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const contacts = state?.contacts ?? [];

  return (
    <SpatialCard className="p-5">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="label font-bold text-slate-800 dark:text-ink-300">Trusted Payees</span>
          </div>
          <span className="font-mono text-[10px] font-semibold text-slate-600 dark:text-ink-400">
            {contacts.length} Verified
          </span>
        </div>

        <ul className="space-y-2">
          {contacts.map((c) => {
            const allowed = state?.recipientAllowlist?.includes(c.address.toLowerCase());
            const isCopied = copied === c.address;

            return (
              <li
                key={c.address}
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5 transition-all hover:border-slate-300 hover:bg-slate-100/80 dark:border-white/[0.04] dark:bg-ink-900/40 dark:hover:border-white/[0.12] dark:hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] text-xs font-bold text-slate-800 dark:text-ink-200 shadow-sm">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-900 dark:text-ink-100">
                      {c.name}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-ink-400">
                      <span>{short(c.address, 5)}</span>
                      <button
                        onClick={() => copyToClipboard(c.address, c.name)}
                        className="text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 transition-colors"
                        title="Copy address"
                      >
                        {isCopied ? <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-lime-400" /> : <Copy className="h-2.5 w-2.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {allowed ? (
                    <span
                      className="chip border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300 text-[9px] font-mono font-semibold"
                      title="Verified trusted payee"
                    >
                      <ShieldCheck className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                      verified
                    </span>
                  ) : (
                    <span className="chip border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-ink-500 text-[9px] font-mono">
                      unverified
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SpatialCard>
  );
}
