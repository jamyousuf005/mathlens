import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="bg-canvas flex min-h-dvh items-center justify-center px-4 py-12 text-ink">
      <div className="border-hairline w-full max-w-md rounded-2xl border bg-surface p-6 shadow-sm sm:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-amber uppercase">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Page not found
        </h1>
        <p className="text-ink-muted mt-3 text-sm leading-6">
          That page does not exist or has moved. Head back home to keep solving.
        </p>

        <Link
          href="/"
          className="bg-ink mt-6 inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium text-surface transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
