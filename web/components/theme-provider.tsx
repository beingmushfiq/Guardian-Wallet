'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (event?: React.MouseEvent<HTMLElement> | MouseEvent) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('guardian-theme') as Theme | null;
    if (savedTheme) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      setThemeState('light');
      applyTheme('light');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('guardian-theme', newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = (event?: React.MouseEvent<HTMLElement> | MouseEvent) => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    // Fall back to immediate switch if View Transitions API is unsupported or user prefers reduced motion
    const doc = typeof document !== 'undefined' ? (document as any) : null;
    if (
      !doc ||
      typeof doc.startViewTransition !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(nextTheme);
      return;
    }

    // Determine circular animation center point from button click coordinates
    let x = window.innerWidth / 2;
    let y = 0;

    if (event && 'clientX' in event && typeof event.clientX === 'number') {
      x = event.clientX;
      y = event.clientY;
    } else {
      const toggleBtn = doc.querySelector('[data-theme-toggle]');
      if (toggleBtn) {
        const rect = toggleBtn.getBoundingClientRect();
        x = rect.left + rect.width / 2;
        y = rect.top + rect.height / 2;
      }
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = doc.startViewTransition(() => {
      setTheme(nextTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`,
      ];

      doc.documentElement.animate(
        {
          clipPath,
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
