import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mathlens-rho.vercel.app';

export const viewport: Viewport = {
  themeColor: '#FCF9EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'MathLens • Web CAS | Deterministic Math Solver',
    template: '%s | MathLens',
  },
  description:
    'Free, private photo, camera, and handwriting math solver. Solves quadratic equations, calculus, and linear systems client-side with verified step-by-step proofs and zero AI hallucinations.',
  keywords: [
    'math solver',
    'photo math solver',
    'handwriting math solver',
    'camera math calculator',
    'step by step math solver',
    'quadratic equation solver',
    'deterministic CAS',
    'client side math solver',
    'free math solver without ai',
    'open source math compiler',
  ],
  authors: [{ name: 'MathLens Team' }],
  creator: 'MathLens',
  publisher: 'MathLens',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    title: 'MathLens • Deterministic Photo & Handwriting Math Solver',
    description:
      'Write, snap, or upload math problems. Solved with 100% deterministic rigor and verified step-by-step proofs. Zero external AI APIs.',
    siteName: 'MathLens',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MathLens • Web CAS | Deterministic Math Solver',
    description:
      'Client-side photo, camera & handwriting math solver with verified step-by-step proofs.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
