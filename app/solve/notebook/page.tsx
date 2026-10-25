'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  clearHistory,
  deleteHistoryItem,
  listHistory,
  setHistoryFavorite,
  type HistoryInputType,
  type HistoryItem,
} from '@/lib/history';
import { MathRenderer } from '@/components/ui/MathRenderer';

const TYPE_LABELS: Record<HistoryInputType, string> = {
  camera: 'Camera',
  upload: 'Upload',
  pad: 'Writing pad',
  typed: 'Typed',
};

function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

export default function NotebookHistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [inputType, setInputType] = useState<'all' | HistoryInputType>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setItems(await listHistory());
    } catch {
      setError('Local history is unavailable in this browser. Solving still works.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const entries = await listHistory();
        if (!cancelled) setItems(entries);
      } catch {
        if (!cancelled) {
          setError('Local history is unavailable in this browser. Solving still works.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (inputType !== 'all' && item.inputType !== inputType) return false;
      if (favoritesOnly && !item.favorite) return false;
      if (!needle) return true;
      return [item.expression, item.problemType, item.finalAnswerPlain, item.finalAnswerLatex]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [favoritesOnly, inputType, items, query]);

  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single'; item: HistoryItem } | { type: 'all' } | null>(null);

  const toggleFavorite = async (item: HistoryItem) => {
    const next = !item.favorite;
    setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, favorite: next } : entry)));
    try {
      await setHistoryFavorite(item.id, next);
    } catch {
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, favorite: !next } : entry)));
      setError('Could not update the favorite in local history.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'single') {
      const { item } = deleteTarget;
      setDeleteTarget(null);
      try {
        await deleteHistoryItem(item.id);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
      } catch {
        setError('Could not delete the saved problem.');
      }
    } else if (deleteTarget.type === 'all') {
      setDeleteTarget(null);
      try {
        await clearHistory();
        setItems([]);
      } catch {
        setError('Could not clear local history.');
      }
    }
  };

  const removeItem = (item: HistoryItem) => {
    setDeleteTarget({ type: 'single', item });
  };

  const removeAll = () => {
    if (!items.length) return;
    setDeleteTarget({ type: 'all' });
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-space-lg px-margin py-space-lg">
        {/* Editorial Title & Status Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-hairline pb-space-sm">
          <div className="flex flex-col gap-1.5 max-w-3xl">
            <h1 className="font-headline-xl text-headline-xl text-ink tracking-tight font-semibold">
              Notebook &amp; Derivation History
            </h1>
            <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
              Review and reopen your verified solutions, step derivations, and mathematical proofs stored privately on this device.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto md:self-end">
            <Link
              href="/solve/type"
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-amber px-4 py-2.5 text-body-sm font-semibold text-ink shadow-xs transition-all hover:brightness-105 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Problem</span>
            </Link>
            <button
              type="button"
              onClick={removeAll}
              disabled={!items.length}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface px-4 py-2.5 text-body-sm font-medium text-ink transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
              <span>Clear All</span>
            </button>
          </div>
        </section>

        {/* Stats & Search/Filter Toolbar */}
        <div className="flex flex-col gap-space-sm">
        

          <section className="flex flex-col gap-3 rounded-2xl border border-hairline bg-surface p-space-md shadow-card md:flex-row md:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-hairline bg-canvas/70 px-3.5 py-2.5 focus-within:border-amber focus-within:ring-1 focus-within:ring-amber transition-all">
              <span className="material-symbols-outlined text-[19px] text-ink-muted">search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent font-body-sm text-sm text-ink outline-none placeholder:text-ink-muted/60"
                placeholder="Search expression, answer, or mathematical topic..."
                aria-label="Search notebook"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="text-ink-muted hover:text-ink cursor-pointer"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              )}
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'camera', 'upload', 'pad', 'typed'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setInputType(type)}
                  className={`rounded-full px-3 py-1.5 font-code-sm text-xs font-medium transition-all cursor-pointer ${
                    inputType === type
                      ? 'bg-ink text-surface shadow-xs'
                      : 'border border-hairline bg-canvas/80 text-ink hover:bg-surface-container'
                  }`}
                >
                  {type === 'all' ? 'All Methods' : TYPE_LABELS[type]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFavoritesOnly((value) => !value)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-code-sm text-xs font-medium transition-all cursor-pointer ${
                  favoritesOnly
                    ? 'bg-amber/20 text-amber border border-amber/40'
                    : 'border border-hairline bg-canvas/80 text-ink hover:bg-surface-container'
                }`}
                aria-pressed={favoritesOnly}
              >
                <span
                  className="material-symbols-outlined text-[15px]"
                  style={{ fontVariationSettings: favoritesOnly ? "'FILL' 1" : "'FILL' 0" }}
                >
                  star
                </span>
                <span>Starred</span>
              </button>
            </div>
          </section>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-error/30 bg-error-container/30 px-3.5 py-2.5 font-body-sm text-sm text-error flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => void load()} className="underline font-semibold cursor-pointer">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-hairline bg-surface text-ink-muted shadow-card">
            <span className="material-symbols-outlined text-[28px] animate-spin text-amber">refresh</span>
            <span className="font-body-sm text-sm">Loading local notebook history...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center gap-3.5 rounded-2xl border border-dashed border-hairline bg-surface p-space-xl text-center shadow-card">
            <div className="w-14 h-14 rounded-full bg-surface-container-low flex items-center justify-center border border-hairline text-amber">
              <span className="material-symbols-outlined text-[30px]">menu_book</span>
            </div>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-ink">
              {items.length ? 'No matching saved problems' : 'Your notebook is empty'}
            </h2>
            <p className="max-w-md font-body-sm text-body-sm text-ink-muted">
              {items.length
                ? 'Try a different search query or method filter.'
                : 'Solve any math problem via Photo, Upload, Handwriting, or Type & Solve and it will appear here.'}
            </p>
            {!items.length && (
              <Link
                href="/solve/capture"
                className="mt-2 rounded-xl bg-amber px-5 py-2.5 text-body-sm font-semibold text-ink shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer"
              >
                Solve Your First Problem
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between gap-2 px-space-xs">
              <span className="font-code-sm text-xs text-ink-muted">
                Showing {filteredItems.length} of {items.length} saved entries
              </span>
              <button
                type="button"
                onClick={() => void load()}
                className="flex items-center gap-1 font-code-sm text-xs text-ink-muted hover:text-ink cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                <span>Refresh List</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="group flex flex-col justify-between gap-4 rounded-2xl border border-hairline bg-surface p-space-md shadow-card transition-all hover:border-amber hover:shadow-md"
                >
                  <div className="flex flex-col gap-space-sm">
                    {/* Top Row: Date on the right */}
                    <div className="flex items-center justify-end">
                      <span className="font-code-sm text-[11px] text-ink-muted">{formatDate(item.createdAt)}</span>
                    </div>

                    {/* Problem Type Title */}
                    <h2 className="font-headline-sm text-lg font-semibold text-ink line-clamp-1 h-7 flex items-center">{item.problemType}</h2>

                    {/* Formula Render Box - strict fixed height and centering */}
                    <div className="h-24 flex items-center justify-center overflow-x-auto rounded-xl border border-hairline bg-canvas/60 p-3 text-center">
                      <MathRenderer math={item.latex || item.expression} block className="text-xl text-ink" />
                    </div>

                    {/* Final Answer Box - strict fixed height and identical baseline */}
                    <div className="h-24 flex flex-col justify-between rounded-xl bg-surface-container-low/70 border border-hairline p-3">
                      <span className="font-code-sm text-[10px] uppercase tracking-widest text-amber font-semibold shrink-0">
                        Final Answer
                      </span>
                      <div className="flex-1 flex items-center overflow-x-auto">
                        <MathRenderer
                          math={item.finalAnswerLatex || item.finalAnswerPlain}
                          className="font-headline-sm text-xl text-ink font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline/60 pt-3">
                    <span className="font-code-sm text-xs text-ink-muted">
                      {item.steps.length} step{item.steps.length === 1 ? '' : 's'} derived
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(item)}
                        className={`flex h-9 w-9 items-center justify-center rounded-xl border border-hairline transition-colors cursor-pointer ${
                          item.favorite
                            ? 'bg-amber/15 border-amber/40 text-amber'
                            : 'bg-surface text-ink-muted hover:bg-surface-container hover:text-ink'
                        }`}
                        title={item.favorite ? 'Starred' : 'Star problem'}
                        aria-pressed={item.favorite}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: item.favorite ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>

                      <Link
                        href={`/solve/type?expr=${encodeURIComponent(item.expression)}&historyId=${encodeURIComponent(item.id)}`}
                        className="flex h-9 items-center gap-1.5 rounded-xl bg-amber px-3.5 font-body-sm text-xs font-semibold text-ink shadow-xs transition-all hover:brightness-105 active:scale-95 cursor-pointer"
                        title="Reopen in Type & Solve"
                      >
                        <span>Reopen</span>
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => removeItem(item)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-surface text-ink-muted transition-colors hover:border-error/40 hover:bg-error-container/30 hover:text-error cursor-pointer"
                        title="Delete saved problem"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* In-app custom confirmation modal (replaces window.confirm) */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-space-md shadow-card flex flex-col gap-space-sm">
            <div className="flex items-center gap-2 text-error font-medium">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              <span className="font-body-sm font-semibold">
                {deleteTarget.type === 'all' ? 'Clear Entire Notebook?' : 'Delete Saved Problem?'}
              </span>
            </div>
            <p className="font-body-sm text-xs text-ink-muted leading-relaxed">
              {deleteTarget.type === 'all'
                ? 'This will permanently remove all saved equations, derivations, and history from this device. This action cannot be undone.'
                : 'This problem will be permanently deleted from your saved notebook.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 rounded-lg border border-hairline bg-surface font-body-sm text-xs font-medium text-ink hover:bg-surface-container transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg bg-error font-body-sm text-xs font-semibold text-white shadow-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                {deleteTarget.type === 'all' ? 'Delete All' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
