import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070a',
          900: '#080c12',
          850: '#0e131d',
          800: '#131926',
          700: '#1b2333',
          600: '#263147',
          500: '#3e4d6a',
          400: '#64748b',
          300: '#94a3b8',
          200: '#cbd5e1',
          100: '#f1f5f9',
          50: '#f8fafc',
        },
        lime: {
          300: '#d9f99d',
          400: '#c9f26b',
          500: '#b4e04f',
          600: '#8fbc2f',
        },
        mint: '#7ee7c0',
        emerald: {
          400: '#34d399',
          500: '#10b981',
        },
        amber: {
          DEFAULT: '#f5c26b',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
        },
        rose: {
          DEFAULT: '#f0788c',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
        },
        sky: {
          DEFAULT: '#7cb8f2',
          400: '#38bdf8',
          500: '#0ea5e9',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 50px -20px rgba(0,0,0,0.85)',
        'panel-hover': '0 1px 0 rgba(255,255,255,0.12) inset, 0 25px 60px -15px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(201,242,107,0.35), 0 0 32px -8px rgba(201,242,107,0.35)',
        'glow-amber': '0 0 0 1px rgba(245,194,107,0.35), 0 0 32px -8px rgba(245,194,107,0.35)',
        'glow-rose': '0 0 0 1px rgba(240,120,140,0.35), 0 0 32px -8px rgba(240,120,140,0.35)',
        'glow-sky': '0 0 0 1px rgba(124,184,242,0.35), 0 0 32px -8px rgba(124,184,242,0.35)',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        rise: 'rise 350ms cubic-bezier(0.16, 1, 0.3, 1) both',
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        pulseSoft: 'pulseSoft 2.5s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
