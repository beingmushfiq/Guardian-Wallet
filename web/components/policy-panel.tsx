'use client';

import type { AgentState } from '@/lib/types';
import { VaultCoreCard } from './bento/vault-core-card';
import { PolicyMetricsCard } from './bento/policy-metrics-card';
import { ApprovedRecipientsCard } from './bento/approved-recipients-card';
import { PowerBoundaryCard } from './bento/power-boundary-card';

export function PolicyPanel({
  state,
  refresh,
  onPaused,
  hasPending = false,
}: {
  state: AgentState | null;
  refresh: () => void;
  onPaused: () => void;
  hasPending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* 3D Vault Core Card */}
      <VaultCoreCard
        state={state}
        refresh={refresh}
        onPaused={onPaused}
        hasPending={hasPending}
      />

      {/* Policy Spending Quotas & Caps */}
      <PolicyMetricsCard state={state} />

      {/* Verified Approved Payees */}
      <ApprovedRecipientsCard state={state} />

      {/* Power Boundary Matrix */}
      <PowerBoundaryCard owner={state?.owner} />
    </div>
  );
}
