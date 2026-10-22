'use client';

import React from 'react';
import Link from 'next/link';

export default function NotebookHistoryPage() {
  const sampleNotebookItems = [
    {
      id: 'eq-001',
      title: 'Quadratic Polynomial Factorization',
      category: 'Algebra & Polynomials',
      timestamp: 'Today, 14:32',
      latex: 'x^2 - 5x + 6 = 0 \\implies x \\in \\{2, 3\\}',
      status: 'Verified Exact',
      stars: true,
    },
    {
      id: 'eq-002',
      title: 'Integration by Parts (Oscillatory)',
      category: 'Calculus & Analysis',
      timestamp: 'Today, 11:15',
      latex: '\\int x \\cdot \\sin(x)\\,dx = -x\\cos(x) + \\sin(x) + C',
      status: 'Step-Verified',
      stars: true,
    },
    {
      id: 'eq-003',
      title: 'Eigenvalues of 2x2 Hermitian Matrix',
      category: 'Linear Algebra',
      timestamp: 'Yesterday, 19:40',
      latex: '\\det(A - \\lambda I) = 0 \\implies \\lambda_1 = 4, \\lambda_2 = -1',
      status: 'Exact CAS',
      stars: false,
    },
    {
      id: 'eq-004',
      title: 'First-Order Separable ODE',
      category: 'Differential Equations',
      timestamp: 'Oct 20, 16:05',
      latex: '\\frac{dy}{dx} = \\frac{y}{x} \\implies y(x) = C \\cdot x',
      status: 'Deterministic',
      stars: false,
    },
  ];

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-margin py-space-lg max-w-[1520px] mx-auto flex flex-col gap-space-lg">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-hairline pb-space-sm">
          <div className="flex flex-col gap-space-xs max-w-3xl">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-olive-tint-soft text-ink font-code-sm text-code-sm font-semibold tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                PERSISTENT SOLVER LOG • METHOD 04
              </span>
              <span className="font-code-sm text-code-sm text-ink-muted">CLIENT LOCAL STORAGE CAS</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-ink tracking-tight font-semibold">
              Notebook &amp; Proof History
            </h1>
            <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
              Review, search, and export previously solved expressions, verified AST proofs, and LaTeX derivation transcripts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/solve/write"
              className="px-4 py-2 rounded-full bg-amber text-ink font-semibold text-body-sm shadow-xs hover:brightness-105 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Problem</span>
            </Link>
          </div>
        </section>

        {/* Notebook Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
          {sampleNotebookItems.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-surface border border-hairline shadow-xs hover:border-amber/60 hover:shadow-sm transition-all flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-code-sm uppercase tracking-wider">{item.category}</span>
                  <div className="flex items-center gap-2">
                    <span>{item.timestamp}</span>
                    {item.stars && (
                      <span className="material-symbols-outlined text-amber text-[16px] fill-current">star</span>
                    )}
                  </div>
                </div>
                <h3 className="font-headline-sm text-base text-ink font-semibold">{item.title}</h3>
                <div className="p-3 rounded-xl bg-canvas border border-hairline font-code-sm text-xs text-ink overflow-x-auto whitespace-nowrap">
                  <code>{item.latex}</code>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-hairline/60">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-code-sm text-ink-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
                  {item.status}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (typeof navigator !== 'undefined') {
                        navigator.clipboard.writeText(item.latex);
                      }
                    }}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-container transition-colors cursor-pointer"
                    title="Copy LaTeX"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                  </button>
                  <Link
                    href="/solve/write"
                    className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-container transition-colors cursor-pointer"
                    title="Open in Canvas"
                  >
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
