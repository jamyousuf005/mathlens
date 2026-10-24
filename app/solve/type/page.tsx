'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { SolutionResult } from '@/lib/engine/types';
import { ExpressionEditor } from '@/components/solve/expression-editor';
import { CompleteSolutionNarrative } from '@/components/solve/complete-solution-narrative';
import { MathRenderer } from '@/components/ui/MathRenderer';
import { saveHistory, setHistoryFavorite } from '@/lib/history';

export default function TypeSolvePage() {
  const [expression, setExpression] = useState('x^2 - 5x + 6 = 0');
  const [solution, setSolution] = useState<SolutionResult | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<'latex' | 'plain' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedExpression = params.get('expr');
    const historyParam = params.get('historyId');

    if (historyParam) {
      import('@/lib/history').then(({ listHistory }) => {
        listHistory().then((items) => {
          const match = items.find((i) => i.id === historyParam);
          if (match) {
            setExpression(match.expression);
            setHistoryId(match.id);
            setIsFavorite(match.favorite);
            setSolution({
              success: true,
              problemType: match.problemType as any,
              normalizedExpression: match.expression,
              latexExpression: match.latex,
              finalAnswerPlain: match.finalAnswerPlain,
              finalAnswerLatex: match.finalAnswerLatex,
              exactAnswer: match.finalAnswerPlain,
              steps: match.steps,
              isVerified: match.isVerified,
              verificationDetails: { lhsValue: 0, rhsValue: 0, residualNorm: 0, status: 'Restored from History' },
              executionTimeMs: 0,
            });
            setHistoryMessage('Restored precomputed solution from Notebook without recomputing.');
          }
        });
      });
      return;
    }

    if (!requestedExpression) return;

    const timeout = window.setTimeout(() => setExpression(requestedExpression), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const handleSolve = async (result: SolutionResult) => {
    setSolution(result);
    setHistoryMessage(null);
    try {
      const record = await saveHistory({
        inputType: 'typed',
        expression: result.normalizedExpression,
        recognizedText: expression.trim(),
        latex: result.latexExpression,
        problemType: result.problemType,
        finalAnswerPlain: result.finalAnswerPlain,
        finalAnswerLatex: result.finalAnswerLatex,
        steps: result.steps,
        isVerified: result.isVerified,
      });
      setHistoryId(record.id);
      setIsFavorite(record.favorite);
      setHistoryMessage('Saved to Notebook.');
    } catch {
      setHistoryMessage('Solved, but local history is unavailable in this browser.');
    }
  };

  const handleFavorite = async () => {
    if (!historyId) {
      if (!solution) return;
      try {
        const record = await saveHistory({
          inputType: 'typed',
          expression: solution.normalizedExpression,
          recognizedText: expression.trim(),
          latex: solution.latexExpression,
          problemType: solution.problemType,
          finalAnswerPlain: solution.finalAnswerPlain,
          finalAnswerLatex: solution.finalAnswerLatex,
          steps: solution.steps,
          isVerified: solution.isVerified,
          favorite: true,
        });
        setHistoryId(record.id);
        setIsFavorite(true);
        setHistoryMessage('Saved to Notebook.');
      } catch {
        setHistoryMessage('Could not update local history.');
      }
      return;
    }
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      await setHistoryFavorite(historyId, next);
    } catch {
      setHistoryMessage('Could not update local history.');
    }
  };

  const copy = async (type: 'latex' | 'plain') => {
    if (!solution) return;
    const text = type === 'latex' ? solution.finalAnswerLatex : solution.finalAnswerPlain;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      setHistoryMessage('Clipboard access was blocked by the browser.');
    }
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-space-lg px-margin py-space-lg">
        <section className="flex flex-col gap-1.5 border-b border-hairline pb-space-sm">
          <div className="flex flex-wrap items-center gap-space-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-tint-soft px-2.5 py-0.5 font-code-sm text-code-sm font-semibold tracking-wider text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-amber"></span>
              METHOD 04 • TYPED EXPRESSION
            </span>
            <span className="font-code-sm text-code-sm text-ink-muted">DETERMINISTIC CAS</span>
          </div>
          <h1 className="font-headline-xl text-headline-xl font-semibold tracking-tight text-ink">
            Type a Problem &amp; Solve
          </h1>
          <p className="max-w-3xl font-body-lg text-body-lg leading-relaxed text-ink-muted">
            Enter an expression with the keyboard or math pad. Review the live validation result,
            then confirm to run the deterministic solver.
          </p>
        </section>

        <div className="grid grid-cols-1 items-start gap-space-lg xl:grid-cols-12">
          <section className="flex flex-col gap-space-md xl:col-span-5">
            <div className="flex flex-col gap-space-sm rounded-xl border border-hairline bg-surface p-space-md shadow-card">
              <div className="flex items-center justify-between gap-2">
                <span className="font-code-sm text-code-sm font-semibold uppercase tracking-wider text-ink-muted">
                  Expression Input
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExpression('');
                    setSolution(null);
                    setHistoryId(null);
                    setIsFavorite(false);
                    setHistoryMessage(null);
                  }}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 font-code-sm text-code-sm text-ink-muted transition-colors hover:bg-surface-container hover:text-ink"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  Clear
                </button>
              </div>
              <ExpressionEditor
                value={expression}
                onChange={(next) => {
                  setExpression(next);
                  setSolution(null);
                  setHistoryId(null);
                  setIsFavorite(false);
                  setHistoryMessage(null);
                }}
                onConfirm={handleSolve}
                confirmLabel="Confirm & Solve"
                inputId="typed-expression"
              />
              <p className="font-code-sm text-[11px] leading-relaxed text-ink-muted">
                Supported: arithmetic, linear equations, quadratics, simplification and expansion.
                Unsupported inputs are rejected before solving.
              </p>
            </div>

            <div className="rounded-xl border border-hairline bg-surface p-space-md shadow-card">
              <h2 className="font-body-sm font-semibold text-ink">Try a Tier 1 example</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['x^2 - 5x + 6 = 0', '3x + 5 = 20', '(x+2)(x+3)', '0.1 + 0.2'].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setExpression(sample);
                      setSolution(null);
                      setHistoryId(null);
                      setIsFavorite(false);
                      setHistoryMessage(null);
                    }}
                    className="rounded-full border border-hairline bg-canvas px-2.5 py-1 font-code-sm text-[11px] text-ink transition-colors hover:border-amber hover:bg-surface-container"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-space-md xl:col-span-7">
            {!solution ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface p-space-lg text-center shadow-card">
                <span className="material-symbols-outlined text-[38px] text-amber">keyboard</span>
                <h2 className="font-headline-sm text-headline-sm font-semibold text-ink">
                  Confirm an expression to see the solution
                </h2>
                <p className="max-w-md font-body-sm text-body-sm text-ink-muted">
                  The solver only runs after you confirm a valid expression. Recognition is kept
                  separate from the deterministic math engine.
                </p>
              </div>
            ) : (
              <>
                <div className="relative flex flex-col gap-space-sm overflow-hidden rounded-xl border border-hairline bg-surface p-space-lg shadow-card">
                  <div className="absolute inset-x-0 top-0 h-1.5 bg-amber"></div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-code-sm text-code-sm font-semibold uppercase tracking-widest text-amber">
                      {solution.problemType}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary-container px-2.5 py-1 font-code-sm text-code-sm font-medium text-on-secondary-fixed">
                      <span className="material-symbols-outlined text-[15px]">
                        {solution.isVerified ? 'verified' : 'info'}
                      </span>
                      {solution.verificationDetails.status}
                    </span>
                  </div>

                  <div className="rounded-lg border border-hairline bg-canvas/70 p-3 text-center">
                    <MathRenderer math={solution.latexExpression} block className="text-xl text-ink sm:text-2xl" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="font-caption text-caption uppercase tracking-wider text-ink-muted">
                      Final Answer
                    </span>
                    <span className="select-all font-serif text-3xl italic text-ink sm:text-4xl">
                      {solution.finalAnswerPlain}
                    </span>
                    <span className="select-all font-code-sm text-code-sm text-ink-muted">
                      {solution.finalAnswerLatex}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => copy('plain')}
                      className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-code-sm text-code-sm text-ink transition-colors hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedType === 'plain' ? 'check' : 'content_copy'}
                      </span>
                      {copiedType === 'plain' ? 'Copied Answer' : 'Copy Answer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => copy('latex')}
                      className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5 font-code-sm text-code-sm text-ink transition-colors hover:bg-surface-container"
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {copiedType === 'latex' ? 'check' : 'code'}
                      </span>
                      {copiedType === 'latex' ? 'Copied LaTeX' : 'Copy LaTeX'}
                    </button>
                    <button
                      type="button"
                      onClick={handleFavorite}
                      className={`flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 font-code-sm text-code-sm transition-colors ${
                        isFavorite ? 'bg-amber/15 text-amber' : 'bg-surface text-ink hover:bg-surface-container'
                      }`}
                    >
                      <span
                        className="material-symbols-outlined text-[15px]"
                        style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                      {isFavorite ? 'Starred' : 'Star'}
                    </button>
                    <Link
                      href="/solve/notebook"
                      className="flex items-center gap-1.5 rounded-full bg-surface-container px-3 py-1.5 font-code-sm text-code-sm text-ink transition-colors hover:bg-surface-container-high"
                    >
                      <span className="material-symbols-outlined text-[15px]">menu_book</span>
                      Notebook
                    </Link>
                  </div>
                  {historyMessage && (
                    <p role="status" className="font-code-sm text-[11px] text-ink-muted">
                      {historyMessage}
                    </p>
                  )}
                </div>


                {/* Complete Written Solution in Text Form (One Go) */}
                <CompleteSolutionNarrative
                  solution={solution}
                  originalProblem={expression}
                  idPrefix="type-narrative"
                />

                <div className="rounded-xl bg-ink p-space-md text-white shadow-card">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-code-sm text-[11px] text-surface-dim">
                    <span>MATHLENS_CAS_KERNEL::VERIFY</span>
                    <span>Residual: {solution.verificationDetails.residualNorm.toExponential(2)}</span>
                  </div>
                  <p className="mt-2 font-code-sm text-[11px] text-amber">
                    &gt; {solution.normalizedExpression}
                  </p>
                  <p className="mt-1 font-code-sm text-[11px] text-surface-container-highest">
                    &gt; {solution.verificationDetails.status} • LHS {solution.verificationDetails.lhsValue} / RHS{' '}
                    {solution.verificationDetails.rhsValue}
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
