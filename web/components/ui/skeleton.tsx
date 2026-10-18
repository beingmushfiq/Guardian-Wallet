'use client';

import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-200/70 dark:bg-white/[0.05] ${className}`}
    >
      <div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-slate-300/60 to-transparent dark:via-white/[0.08] animate-[shimmer_1.8s_infinite]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(200,200,200,0.3) 50%, rgba(255,255,255,0) 100%)',
        }}
      />
    </div>
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-ink-900/60 dark:shadow-panel ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>

      <div className="my-4 h-32 flex items-center justify-center">
        <div className="h-24 w-24 rounded-full border border-slate-300/40 dark:border-white/10 p-2">
          <Skeleton className="h-full w-full rounded-full" />
        </div>
      </div>

      <div className="space-y-2 rounded-xl bg-slate-100/60 p-3.5 dark:bg-ink-900/40">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>

      <div className="mt-4">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTerminal({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex flex-col rounded-2xl border border-slate-200/80 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-ink-900/60 dark:shadow-panel ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 dark:border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-40" />
      </div>

      <div className="flex-1 space-y-4 py-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-14 w-3/4 rounded-2xl" />
          </div>
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-1/2 rounded-2xl" />
        </div>

        <div className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-200/60 pt-3 dark:border-white/[0.06]">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-xl" />
          <Skeleton className="h-8 w-36 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
