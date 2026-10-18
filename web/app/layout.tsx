import type { Metadata, Viewport } from 'next';
import { Inter, Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { SmoothScrollProvider } from '@/components/smooth-scroll';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Guardian Wallet — Spend with intent, not blind trust',
  description:
    'Autonomous, policy-bounded AI wallet agent with deterministic smart contract boundary. Proposes with intelligence, enforces with cryptography.',
  applicationName: 'Guardian Wallet',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Guardian Wallet',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/favicon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    title: 'Guardian Wallet — Spend with Intent, Not Blind Trust',
    description:
      'Autonomous AI Wallet Agent protected by deterministic policy and on-chain vault boundaries.',
    type: 'website',
    siteName: 'Guardian Wallet',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guardian Wallet — Policy-Bounded AI Agent',
    description:
      'The model proposes, deterministic policy and an on-chain vault dispose.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} ${jetbrainsMono.variable} light`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const t = localStorage.getItem('guardian-theme');
                if (t === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.add('light');
                  document.documentElement.classList.remove('dark');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased selection:bg-lime-400/25 selection:text-white">
        <SmoothScrollProvider>
          <Providers>{children}</Providers>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
