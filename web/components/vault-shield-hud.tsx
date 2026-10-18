'use client';

import { useState } from 'react';
import { Shield, Lock, AlertTriangle, Fingerprint, ShieldCheck, Zap } from 'lucide-react';

interface VaultShieldHUDProps {
  status: 'safe' | 'pending' | 'paused';
  className?: string;
}

export function VaultShieldHUD({ status, className = '' }: VaultShieldHUDProps) {
  const [interactivePulse, setInteractivePulse] = useState(false);

  const isPaused = status === 'paused';
  const isPending = status === 'pending';

  // State colors
  const primaryColor = isPaused
    ? '#f43f5e' // Rose
    : isPending
    ? '#f59e0b' // Amber
    : '#10b981'; // Cyber-Emerald

  const accentColor = isPaused
    ? '#fb7185'
    : isPending
    ? '#fbbf24'
    : '#84cc16'; // Electric Lime

  function handleTriggerPulse() {
    setInteractivePulse(true);
    setTimeout(() => setInteractivePulse(false), 900);
  }

  return (
    <div
      onClick={handleTriggerPulse}
      className={`relative flex flex-col items-center justify-center select-none overflow-hidden cursor-pointer group ${className}`}
      title="Biometric Holographic Vault — Tap to trigger security scan"
    >
      {/* Background Radial Ambient Glow */}
      <div
        className="pointer-events-none absolute h-56 w-56 rounded-full blur-3xl opacity-25 dark:opacity-35 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${primaryColor} 0%, ${accentColor} 45%, transparent 70%)`,
          transform: interactivePulse ? 'scale(1.3)' : 'scale(1)',
        }}
      />

      {/* Outer Concentric Animated Radar Rings */}
      <div className="relative flex items-center justify-center w-48 h-48 sm:w-52 sm:h-52">
        {/* Radar Ring 1: Slow Rotate */}
        <div
          className="absolute inset-0 rounded-full border border-dashed opacity-30 dark:opacity-40 transition-colors duration-500 animate-[spin_24s_linear_infinite]"
          style={{ borderColor: primaryColor }}
        />

        {/* Radar Ring 2: Reverse Rotate */}
        <div
          className="absolute inset-3 rounded-full border border-dotted opacity-40 dark:opacity-50 transition-colors duration-500 animate-[spin_18s_linear_infinite_reverse]"
          style={{ borderColor: accentColor }}
        />

        {/* Pulse Ripple Wave on Click/Active */}
        <div
          className={`absolute inset-1 rounded-full border-2 transition-all duration-700 pointer-events-none ${
            interactivePulse ? 'opacity-90 scale-110' : 'opacity-20 scale-95 animate-ping'
          }`}
          style={{ borderColor: primaryColor }}
        />

        {/* Orbiting Security Satellites */}
        <div className="absolute inset-0 animate-[spin_12s_linear_infinite]">
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full shadow-lg"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
        </div>
        <div className="absolute inset-4 animate-[spin_16s_linear_infinite_reverse]">
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 0 8px ${primaryColor}`,
            }}
          />
        </div>

        {/* Holographic Shield Container */}
        <div className="relative flex flex-col items-center justify-center z-10 transition-transform duration-300 group-hover:scale-105">
          {/* Cyber Shield Backdrop Glass */}
          <div
            className="relative flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 rounded-3xl backdrop-blur-md transition-all duration-500"
            style={{
              background: `linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.15) 100%)`,
              border: `1.5px solid ${primaryColor}66`,
              boxShadow: `0 0 25px ${primaryColor}33, inset 0 0 20px ${primaryColor}1a`,
            }}
          >
            {/* Center Biometric Emblem */}
            {isPaused ? (
              <div className="flex flex-col items-center text-rose-500 animate-pulse">
                <Lock className="h-10 w-10 sm:h-12 sm:w-12 stroke-[1.8]" />
                <span className="mt-1 font-mono text-[9px] font-bold tracking-widest uppercase">
                  FROZEN
                </span>
              </div>
            ) : isPending ? (
              <div className="flex flex-col items-center text-amber-500 animate-pulse">
                <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 stroke-[1.8]" />
                <span className="mt-1 font-mono text-[9px] font-bold tracking-widest uppercase">
                  CONFIRM
                </span>
              </div>
            ) : (
              <div className="relative flex flex-col items-center">
                <Fingerprint
                  className="h-10 w-10 sm:h-12 sm:w-12 transition-colors duration-500 stroke-[1.6]"
                  style={{ color: accentColor }}
                />
                {/* Micro Scanline Beam moving over the fingerprint */}
                <div
                  className="absolute inset-x-0 h-0.5 animate-[bounce_2s_ease-in-out_infinite] opacity-75"
                  style={{
                    backgroundColor: primaryColor,
                    boxShadow: `0 0 6px ${primaryColor}`,
                  }}
                />
                <span
                  className="mt-1 font-mono text-[9px] font-extrabold tracking-widest uppercase"
                  style={{ color: primaryColor }}
                >
                  SECURE
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-HUD Telemetry Chip */}
      <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1 dark:border-white/10 dark:bg-slate-900/80 backdrop-blur-md shadow-sm">
        <span
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: primaryColor }}
        />
        <span className="font-mono text-[10px] font-bold tracking-wide text-slate-800 dark:text-slate-200">
          {isPaused
            ? 'POLICY LOCK: ALL PAYMENTS FROZEN'
            : isPending
            ? 'ACTION PENDING: OWNER APPROVAL NEEDED'
            : 'ZERO-TRUST VAULT SHIELD · ACTIVE'}
        </span>
      </div>
    </div>
  );
}
