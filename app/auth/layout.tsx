import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In • MathLens | Access Academic Mathematical Workspace',
  description:
    'Sign in to MathLens using Google or email OTP, or continue as a guest. Gemini handles optional OCR; solving and saved history stay deterministic and on-device.',
  keywords: [
    'math solver sign in',
    'mathlens login',
    'math problem solver account',
    'private math workspace',
    'deterministic CAS solver',
  ],
  alternates: {
    canonical: 'https://mathlens-rho.vercel.app/auth',
  },
  openGraph: {
    title: 'Sign In • MathLens Mathematical Workspace',
    description:
      'Access your private, deterministic math notebook. Solve arithmetic, linear, and quadratic problems with a deterministic client-side engine.',
    url: 'https://mathlens-rho.vercel.app/auth',
    siteName: 'MathLens',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign In • MathLens Mathematical Workspace',
    description: 'Instant Google or email OTP login for deterministic math solving.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Sign In • MathLens Academic Workspace',
    url: 'https://mathlens-rho.vercel.app/auth',
    description:
      'Sign in to MathLens using Google or email OTP to save step-by-step derivations, or continue locally as a guest.',
    isPartOf: {
      '@type': 'WebSite',
      name: 'MathLens',
      url: 'https://mathlens-rho.vercel.app',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://mathlens-rho.vercel.app',
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Sign In',
          item: 'https://mathlens-rho.vercel.app/auth',
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
