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

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration = 4000) => {
    const id = crypto.randomUUID();
    const newToast: ToastItem = { id, type, title, message, duration };
    setToasts((prev) => [...prev.slice(-3), newToast]); // keep max 4 toasts
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
      {/* Toast Viewport */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex max-w-sm flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const interval = 20;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [duration, onClose]);

  const styleConfig = {
    success: {
      border: 'border-emerald-500/40 dark:border-emerald-400/35',
      bg: 'bg-white/95 dark:bg-ink-900/95',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      progress: 'bg-emerald-500 dark:bg-emerald-400',
      glow: 'shadow-[0_10px_30px_-5px_rgba(16,185,129,0.25)]',
    },
    warning: {
      border: 'border-amber-500/40 dark:border-amber-400/35',
      bg: 'bg-white/95 dark:bg-ink-900/95',
      icon: AlertTriangle,
      iconColor: 'text-amber-600 dark:text-amber-400',
      progress: 'bg-amber-500 dark:bg-amber-400',
      glow: 'shadow-[0_10px_30px_-5px_rgba(245,158,11,0.25)]',
    },
    error: {
      border: 'border-rose-500/40 dark:border-rose-500/35',
      bg: 'bg-white/95 dark:bg-ink-900/95',
      icon: AlertOctagon,
      iconColor: 'text-rose-600 dark:text-rose-400',
      progress: 'bg-rose-500 dark:bg-rose-400',
      glow: 'shadow-[0_10px_30px_-5px_rgba(244,63,94,0.25)]',
    },
    info: {
      border: 'border-sky-500/40 dark:border-sky-400/35',
      bg: 'bg-white/95 dark:bg-ink-900/95',
      icon: Info,
      iconColor: 'text-sky-600 dark:text-sky-400',
      progress: 'bg-sky-500 dark:bg-sky-400',
      glow: 'shadow-[0_10px_30px_-5px_rgba(56,189,248,0.25)]',
    },
  }[toast.type];

  const Icon = styleConfig.icon;

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border ${styleConfig.border} ${styleConfig.bg} ${styleConfig.glow} p-4 shadow-xl backdrop-blur-2xl transition-all duration-300 animate-rise`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 ${styleConfig.iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1 pr-2">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{toast.title}</h4>
          {toast.message && (
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              {toast.message}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          title="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress countdown bar */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/5 dark:bg-white/5">
        <div
          className={`h-full ${styleConfig.progress} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
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
