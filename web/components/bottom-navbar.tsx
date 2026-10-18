'use client';

import { MessageSquare, Shield, Activity, Sliders } from 'lucide-react';

export type MobileTab = 'chat' | 'vault' | 'activity' | 'rules';

interface BottomNavBarProps {
  activeTab: MobileTab;
  onChange: (tab: MobileTab) => void;
  pendingCount?: number;
}

export function BottomNavBar({ activeTab, onChange, pendingCount = 0 }: BottomNavBarProps) {
  const tabs = [
    {
      id: 'chat' as MobileTab,
      label: 'Assistant',
      icon: MessageSquare,
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      id: 'vault' as MobileTab,
      label: 'Vault',
      icon: Shield,
    },
    {
      id: 'activity' as MobileTab,
      label: 'Activity',
      icon: Activity,
    },
    {
      id: 'rules' as MobileTab,
      label: 'Rules',
      icon: Sliders,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-3 inset-x-3 z-50 max-w-md mx-auto lg:hidden"
    >
      <div className="flex items-center justify-around rounded-2xl border border-slate-200/90 bg-white/92 p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-slate-950/90 dark:shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative flex flex-1 flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-700 dark:bg-lime-400/15 dark:text-lime-300 font-bold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                  }`}
                />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-slate-950 shadow-[0_0_8px_#f59e0b] animate-bounce">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[10px] tracking-tight">{tab.label}</span>

              {/* Active Bottom Glow Pip */}
              {isActive && (
                <span className="absolute bottom-1 h-0.5 w-5 rounded-full bg-emerald-600 dark:bg-lime-400 shadow-[0_0_6px_#10b981]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
