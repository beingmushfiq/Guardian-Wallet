'use client';

import { useState } from 'react';
import type { AgentState } from '@/lib/types';
import { api, short } from '@/lib/api';
import { SpatialCard } from '@/components/spatial-card';
import { useToast } from '@/components/ui/toast';
import { useOwnerSigner } from '@/components/wallet';
import {
  Users,
  Copy,
  Check,
  ShieldCheck,
  UserPlus,
  X,
  Loader2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export function ApprovedRecipientsCard({
  state,
  refresh,
}: {
  state: AgentState | null;
  refresh?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const signOwner = useOwnerSigner();

  const copyToClipboard = (addr: string, contactName: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    toast.info('Address Copied', `Copied ${contactName}'s address to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const contacts = state?.contacts ?? [];

  const isValidAddress = /^0x[0-9a-fA-F]{40}$/.test(address.trim());
  const isValidName = name.trim().length > 0;
  const canSubmit = isValidAddress && isValidName && !saving;

  const handleAddPayee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    try {
      const res = await api.addPayee(name.trim(), address.trim());
      if (res.mode === 'live' && res.call) {
        toast.info('Owner Confirmation Required', 'Please confirm the allowlist transaction in your wallet.');
        await signOwner(res.call);
      }
      toast.success(
        'Trusted Payee Added',
        `${name.trim()} (${short(address.trim(), 4)}) is now on your verified allowlist.`,
      );
      setName('');
      setAddress('');
      setIsAdding(false);
      refresh?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error('Failed to Add Payee', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleFillDemo = () => {
    setName('Cloud Infrastructure Hosting');
    setAddress('0x3a19F36e8642217f54c30F0eb81F4B84f5C4703a');
  };

  return (
    <SpatialCard className="p-4.5 sm:p-5">
      <div className="space-y-4">
        {/* Card Header with Add Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="label font-bold text-slate-800 dark:text-ink-300">
              Trusted Payees
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-semibold text-slate-500 dark:text-ink-400">
              {contacts.length} Verified
            </span>
            {!isAdding ? (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="group inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-800 dark:border-lime-400/30 dark:bg-lime-400/10 dark:text-lime-300 hover:bg-emerald-500/20 dark:hover:bg-lime-400/20 active:scale-95 transition-all shadow-sm"
                title="Add a new trusted payee to your allowlist"
              >
                <UserPlus className="h-3 w-3 transition-transform group-hover:scale-110" />
                <span>+ Add Payee</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-white/10 dark:bg-white/[0.05] dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
              >
                <X className="h-3 w-3" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Trusted Payee Drawer/Form */}
        {isAdding && (
          <form
            onSubmit={handleAddPayee}
            className="animate-rise rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-sky-500/[0.04] p-3.5 sm:p-4 space-y-3.5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-lime-400" />
                <span>Add Trusted Payee to Allowlist</span>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-700 dark:text-lime-300 hover:underline"
              >
                <Sparkles className="h-2.5 w-2.5" />
                <span>Sample</span>
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">
                  Payee or Service Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Cloud, Alice Freelancer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-emerald-500 dark:focus:border-lime-400 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    Ethereum Address (0x...)
                  </label>
                  {address && !isValidAddress && (
                    <span className="text-[10px] text-rose-500 font-mono">
                      Must be 42-char hex (0x...)
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="0x..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`w-full rounded-xl border bg-white dark:bg-slate-900/90 px-3 py-1.5 font-mono text-xs text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none ${
                    address && !isValidAddress
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-300 dark:border-white/10 focus:border-emerald-500 dark:focus:border-lime-400'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                disabled={saving}
                className="btn-ghost !py-1.5 !px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn-primary !py-1.5 !px-4 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Adding Payee…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Save Payee</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
            No trusted payees added yet. Click &quot;+ Add Payee&quot; above to allowlist a recipient.
          </div>
        ) : (
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
                          type="button"
                          onClick={() => copyToClipboard(c.address, c.name)}
                          className="text-slate-400 hover:text-emerald-600 dark:hover:text-lime-300 transition-colors"
                          title="Copy address"
                        >
                          {isCopied ? (
                            <Check className="h-2.5 w-2.5 text-emerald-600 dark:text-lime-400" />
                          ) : (
                            <Copy className="h-2.5 w-2.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {allowed ? (
                      <span
                        className="chip border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300 text-[9px] font-mono font-semibold"
                        title="Verified trusted payee on allowlist"
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
        )}
      </div>
    </SpatialCard>
  );
}
