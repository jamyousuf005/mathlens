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

const TYPE_ICONS: Record<HistoryInputType, string> = {
  camera: 'photo_camera',
  upload: 'upload_file',
  pad: 'draw',
  typed: 'keyboard',
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const removeItem = async (item: HistoryItem) => {
    if (!window.confirm('Delete this saved problem from the notebook?')) return;
    try {
      await deleteHistoryItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch {
      setError('Could not delete the saved problem.');
    }
  };

  const removeAll = async () => {
    if (!items.length || !window.confirm('Delete every saved problem from this device?')) return;
    try {
      await clearHistory();
      setItems([]);
    } catch {
      setError('Could not clear local history.');
    }
  };

  const copyLatex = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.latex || item.expression);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setError('Clipboard access was blocked by the browser.');
    }
  };

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-space-lg px-margin py-space-lg">
        <section className="flex flex-col justify-between gap-space-md border-b border-hairline pb-space-sm md:flex-row md:items-end">
          <div className="flex max-w-3xl flex-col gap-space-xs">
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-tint-soft px-2.5 py-0.5 font-code-sm text-code-sm font-semibold tracking-wider text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-amber"></span>
                LOCAL NOTEBOOK • METHOD 05
              </span>
              <span className="font-code-sm text-code-sm text-ink-muted">ON-DEVICE INDEXEDDB HISTORY</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl font-semibold tracking-tight text-ink">
              Notebook &amp; Derivation History
            </h1>
            <p className="font-body-lg text-body-lg leading-relaxed text-ink-muted">
              Saved problems stay on this device. Search, reopen, favorite, copy, or delete each
              entry without sending math content to a server.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/solve/type"
              className="flex items-center gap-1.5 rounded-full bg-amber px-4 py-2 text-body-sm font-semibold text-ink shadow-xs transition-all hover:brightness-105"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Problem
            </Link>
            <button
              type="button"
              onClick={removeAll}
              disabled={!items.length}
              className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 py-2 text-body-sm font-medium text-ink transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
              Clear All
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface p-3 shadow-card sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-hairline bg-canvas px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-ink-muted">search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="min-w-0 flex-1 bg-transparent font-body-sm text-sm text-ink outline-none placeholder:text-ink-muted/60"
              placeholder="Search expression, type, or answer"
              aria-label="Search notebook"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-ink-muted hover:text-ink"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[17px]">close</span>
              </button>
            )}
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'camera', 'upload', 'pad', 'typed'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setInputType(type)}
                className={`rounded-full px-2.5 py-1 font-code-sm text-[11px] transition-colors ${
                  inputType === type
                    ? 'bg-ink text-surface'
                    : 'border border-hairline bg-surface text-ink-muted hover:bg-surface-container'
                }`}
              >
                {type === 'all' ? 'All' : TYPE_LABELS[type]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFavoritesOnly((value) => !value)}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-code-sm text-[11px] transition-colors ${
                favoritesOnly
                  ? 'bg-amber/20 text-amber'
                  : 'border border-hairline bg-surface text-ink-muted hover:bg-surface-container'
              }`}
              aria-pressed={favoritesOnly}
            >
              <span className="material-symbols-outlined text-[14px]">star</span>
              Starred
            </button>
          </div>
        </section>

        {error && (
          <div role="alert" className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 font-body-sm text-sm text-error">
            {error}
            <button type="button" onClick={() => void load()} className="ml-2 underline">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center gap-2 rounded-xl border border-hairline bg-surface text-ink-muted shadow-card">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            Loading local history...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface p-space-lg text-center shadow-card">
            <span className="material-symbols-outlined text-[42px] text-amber">menu_book</span>
            <h2 className="font-headline-sm text-headline-sm font-semibold text-ink">
              {items.length ? 'No matching saved problems' : 'Your notebook is empty'}
            </h2>
            <p className="max-w-md font-body-sm text-body-sm text-ink-muted">
              {items.length
                ? 'Try a different search term or filter.'
                : 'Solve a problem from any input tab and it will appear here automatically.'}
            </p>
            {!items.length && (
              <Link
                href="/solve/capture"
                className="mt-1 rounded-full bg-amber px-4 py-2 text-body-sm font-semibold text-ink"
              >
                Start with a problem
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 px-space-xs">
              <span className="font-code-sm text-code-sm text-ink-muted">
                {filteredItems.length} of {items.length} saved
              </span>
              <button
                type="button"
                onClick={() => void load()}
                className="flex items-center gap-1 font-code-sm text-code-sm text-ink-muted hover:text-ink"
              >
                <span className="material-symbols-outlined text-[15px]">refresh</span>
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 gap-space-md md:grid-cols-2">
              {filteredItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col justify-between gap-4 rounded-2xl border border-hairline bg-surface p-5 shadow-xs transition-all hover:border-amber/60 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted">
                      <span className="inline-flex items-center gap-1 font-code-sm uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[15px]">{TYPE_ICONS[item.inputType]}</span>
                        {TYPE_LABELS[item.inputType]}
                      </span>
                      <span className="font-code-sm text-[11px]">{formatDate(item.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-headline-sm text-base font-semibold text-ink">{item.problemType}</h2>
                      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-code-sm text-[10px] ${
                        item.isVerified
                          ? 'bg-secondary-container text-on-secondary-fixed'
                          : 'bg-surface-container text-ink-muted'
                      }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {item.isVerified ? 'verified' : 'info'}
                        </span>
                        {item.isVerified ? 'Verified' : 'Solved'}
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-hairline bg-canvas p-3">
                      <MathRenderer math={item.latex || item.expression} className="text-base text-ink" />
                    </div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-caption text-caption uppercase text-ink-muted">Answer</span>
                      <code className="select-all font-code-sm text-code-sm font-semibold text-ink">
                        {item.finalAnswerPlain}
                      </code>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline/60 pt-2">
                    <span className="font-code-sm text-[11px] text-ink-muted">
                      {item.steps.length} step{item.steps.length === 1 ? '' : 's'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void toggleFavorite(item)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-container ${
                          item.favorite ? 'text-amber' : 'text-ink-muted hover:text-ink'
                        }`}
                        aria-label={item.favorite ? 'Remove favorite' : 'Favorite problem'}
                        aria-pressed={item.favorite}
                      >
                        <span
                          className="material-symbols-outlined text-[17px]"
                          style={{ fontVariationSettings: item.favorite ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyLatex(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-container hover:text-ink"
                        aria-label="Copy LaTeX"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedId === item.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                      <Link
                        href={`/solve/type?expr=${encodeURIComponent(item.expression)}&historyId=${encodeURIComponent(item.id)}`}
                        className="flex h-8 items-center gap-1 rounded-lg px-2 text-ink-muted transition-colors hover:bg-surface-container hover:text-ink"
                        aria-label="Reopen expression"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        <span className="font-code-sm text-[11px]">Open</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeItem(item)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-error-container/40 hover:text-error"
                        aria-label="Delete saved problem"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
