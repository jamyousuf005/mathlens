'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    const digest =
      error instanceof Error
        ? (error as Error & { digest?: string }).digest
        : undefined;
    console.error(`[mathlens] global error${digest ? ` (digest: ${digest})` : ''}`);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#FCF9EA',
          color: '#1E231D',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        }}
      >
        <main style={{ width: '100%', maxWidth: '440px' }}>
          <div
            style={{
              border: '1px solid rgba(30, 35, 29, 0.12)',
              borderRadius: '16px',
              background: '#FFFFFF',
              padding: '28px',
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#DB9558',
              }}
            >
              Application error
            </p>
            <h1 style={{ margin: '12px 0 0', fontSize: '26px', lineHeight: 1.2 }}>
              Something went wrong
            </h1>
            <p
              style={{
                margin: '12px 0 0',
                fontSize: '14px',
                lineHeight: 1.6,
                color: 'rgba(30, 35, 29, 0.62)',
              }}
            >
              The app hit an unexpected error. Reload to try again.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{
                  minHeight: '44px',
                  padding: '10px 20px',
                  border: 0,
                  borderRadius: '12px',
                  background: '#1E231D',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <Link
                href="/"
                style={{
                  minHeight: '44px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  border: '1px solid rgba(30, 35, 29, 0.12)',
                  borderRadius: '12px',
                  background: '#F1F5EB',
                  color: '#1E231D',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Go home
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
