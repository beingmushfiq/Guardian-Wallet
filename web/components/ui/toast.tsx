'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
  };
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 3000) => {
    const id = crypto.randomUUID();
    const newToast: ToastItem = { id, type, title, message, duration };
    setToasts((prev) => [...prev.slice(-2), newToast]); // Stack max 3 toasts
  }, []);

  const toast = {
    success: (title: string, message?: string, duration?: number) => addToast('success', title, message, duration),
    warning: (title: string, message?: string, duration?: number) => addToast('warning', title, message, duration),
    error: (title: string, message?: string, duration?: number) => addToast('error', title, message, duration),
    info: (title: string, message?: string, duration?: number) => addToast('info', title, message, duration),
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      {/* Dynamic Floating Pill Toast Container (Top Center) */}
      <div
        aria-live="polite"
        className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4"
      >
        {toasts.map((t) => (
          <ToastPill key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastPill({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const config = {
    success: {
      border: 'border-emerald-500/40 dark:border-emerald-400/40',
      bg: 'bg-emerald-950/85 dark:bg-emerald-950/90 text-white',
      dot: 'bg-emerald-400 shadow-[0_0_10px_#34d399]',
      glow: 'shadow-[0_12px_32px_rgba(16,185,129,0.35)]',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
    },
    warning: {
      border: 'border-amber-500/40 dark:border-amber-400/40',
      bg: 'bg-amber-950/85 dark:bg-amber-950/90 text-white',
      dot: 'bg-amber-400 shadow-[0_0_10px_#f59e0b]',
      glow: 'shadow-[0_12px_32px_rgba(245,158,11,0.35)]',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
    },
    error: {
      border: 'border-rose-500/40 dark:border-rose-400/40',
      bg: 'bg-rose-950/85 dark:bg-rose-950/90 text-white',
      dot: 'bg-rose-400 shadow-[0_0_10px_#f43f5e]',
      glow: 'shadow-[0_12px_32px_rgba(244,63,94,0.35)]',
      icon: AlertOctagon,
      iconColor: 'text-rose-400',
    },
    info: {
      border: 'border-sky-500/40 dark:border-cyan-400/40',
      bg: 'bg-slate-900/90 dark:bg-slate-900/95 text-white',
      dot: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]',
      glow: 'shadow-[0_12px_32px_rgba(6,182,212,0.35)]',
      icon: Info,
      iconColor: 'text-cyan-400',
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      onClick={onClose}
      className={`pointer-events-auto flex items-center gap-3 rounded-full border ${config.border} ${config.bg} ${config.glow} px-4 py-2.5 backdrop-blur-2xl transition-all duration-300 animate-rise cursor-pointer select-none hover:scale-105 active:scale-95`}
      title="Click to dismiss"
    >
      <span className={`h-2 w-2 rounded-full ${config.dot} shrink-0 animate-pulseSoft`} />
      <Icon className={`h-4 w-4 shrink-0 ${config.iconColor}`} />
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-xs font-bold tracking-tight text-white whitespace-nowrap">
          {toast.title}
        </span>
        {toast.message && (
          <span className="text-[11px] font-medium text-slate-300 truncate max-w-[220px]">
            {toast.message}
          </span>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="ml-1 text-white/50 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
