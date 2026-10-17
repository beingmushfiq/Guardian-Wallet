import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07090c',
          900: '#0b0e13',
          800: '#12161d',
          700: '#1a202a',
          600: '#252d3a',
          400: '#6b7787',
          300: '#98a3b2',
          200: '#c3cbd6',
          100: '#e7ebf0',
        },
        lime: {
          400: '#c9f26b',
          500: '#b4e04f',
          600: '#8fbc2f',
        },
        mint: '#7ee7c0',
        amber: '#f5c26b',
        rose: '#f0788c',
        sky: '#7cb8f2',
      },
      fontFamily: {
        sans: ['"Inter"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        display: ['"Iowan Old Style"', '"Palatino Linotype"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SFMono-Regular"', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 60px -30px rgba(0,0,0,0.9)',
        glow: '0 0 0 1px rgba(201,242,107,0.35), 0 0 32px -8px rgba(201,242,107,0.35)',
      },
      keyframes: {
        rise: { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'none' } },
        pulseSoft: { '0%,100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
      },
      animation: {
        rise: 'rise 320ms cubic-bezier(0.22,1,0.36,1) both',
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
