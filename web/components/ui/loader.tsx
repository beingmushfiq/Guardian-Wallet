'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LoaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
  className?: string;
}

export function BeautifulLoader({
  label = 'Verifying security rules…',
  size = 'md',
  className = '',
}: LoaderProps) {
  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl">
        <LoaderCore label={label} size="lg" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-6 ${className}`}>
      <LoaderCore label={label} size={size} />
    </div>
  );
}

function LoaderCore({ label, size }: { label?: string; size: 'sm' | 'md' | 'lg' }) {
  const dimensions = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  }[size];

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }[size];

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative flex items-center justify-center ${dimensions}`}>
        {/* Outer Orbital Rotating Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-lime-400/20 border-t-lime-400 dark:border-lime-400/20 dark:border-t-lime-400 animate-spin" />

        {/* Counter-Rotating Middle Ring */}
        <div
          className="absolute inset-1.5 rounded-full border-2 border-emerald-500/20 border-b-emerald-400 dark:border-emerald-400/20 dark:border-b-emerald-400 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '1.8s' }}
        />

        {/* Ambient Pulsing Glow */}
        <div className="absolute inset-3 rounded-full bg-lime-400/20 dark:bg-lime-400/20 blur-md animate-pulseSoft" />

        {/* Center Shield Core */}
        <div className="relative flex items-center justify-center text-lime-600 dark:text-lime-300">
          <ShieldCheck className={`${iconSizes} animate-pulseSoft`} />
        </div>
      </div>

      {label && (
        <span className="text-center font-mono text-xs font-medium text-slate-600 dark:text-ink-300">
          {label}
        </span>
      )}
    </div>
  );
}
