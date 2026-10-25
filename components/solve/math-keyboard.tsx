'use client';

import React, { useState } from 'react';

type KeypadTab = 'basic' | 'calculus' | 'functions';

interface KeyConfig {
  label: string;
  value?: string;
  action?: 'insert' | 'delete' | 'space' | 'clear';
  span?: number;
  highlight?: boolean;
}

const BASIC_KEYS: KeyConfig[][] = [
  [
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: '÷', value: '/' },
    { label: 'Del', action: 'delete' },
  ],
  [
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '×', value: '*' },
    { label: '^', value: '^' },
  ],
  [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '-', value: '-' },
    { label: '√', value: 'sqrt(' },
  ],
  [
    { label: '0', value: '0' },
    { label: '.', value: '.' },
    { label: 'x', value: 'x' },
    { label: '+', value: '+' },
    { label: '=', value: '=' },
  ],
  [
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: 'y', value: 'y' },
    { label: 'Space', action: 'space', span: 2 },
  ],
];

const CALCULUS_KEYS: KeyConfig[][] = [
  [
    { label: 'd/dx', value: 'd/dx(', highlight: true },
    { label: '∫ dx', value: 'int(', highlight: true },
    { label: 'dx', value: 'dx' },
    { label: 'x^n', value: '^' },
    { label: 'Del', action: 'delete' },
  ],
  [
    { label: 'x', value: 'x' },
    { label: 'y', value: 'y' },
    { label: 't', value: 't' },
    { label: 'd/dt', value: 'd/dt(' },
    { label: 'dt', value: 'dt' },
  ],
  [
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: '=', value: '=' },
  ],
  [
    { label: 'x²', value: '^2' },
    { label: 'x³', value: '^3' },
    { label: '√', value: 'sqrt(' },
    { label: 'Space', action: 'space', span: 2 },
  ],
];

const FUNCTION_KEYS: KeyConfig[][] = [
  [
    { label: 'sin', value: 'sin(' },
    { label: 'cos', value: 'cos(' },
    { label: 'tan', value: 'tan(' },
    { label: 'ln', value: 'ln(' },
    { label: 'Del', action: 'delete' },
  ],
  [
    { label: 'log', value: 'log(' },
    { label: '√', value: 'sqrt(' },
    { label: '|x|', value: '|' },
    { label: '!', value: '!' },
    { label: '%', value: '%' },
  ],
  [
    { label: '(', value: '(' },
    { label: ')', value: ')' },
    { label: 'x', value: 'x' },
    { label: 'y', value: 'y' },
    { label: '=', value: '=' },
  ],
  [
    { label: '^', value: '^' },
    { label: '+', value: '+' },
    { label: '-', value: '-' },
    { label: 'Space', action: 'space', span: 2 },
  ],
];

interface MathKeyboardProps {
  onInsert: (value: string) => void;
  onBackspace: () => void;
  className?: string;
}

export function MathKeyboard({ onInsert, onBackspace, className = '' }: MathKeyboardProps) {
  const [activeTab, setActiveTab] = useState<KeypadTab>('basic');

  const rows = activeTab === 'calculus'
    ? CALCULUS_KEYS
    : activeTab === 'functions'
    ? FUNCTION_KEYS
    : BASIC_KEYS;

  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-hairline bg-surface-container-low p-2 sm:p-2.5 ${className}`}>
      {/* Category Tabs: Scrollable on small screens */}
      <div className="flex items-center border-b border-hairline pb-1.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]">
        <div className="flex items-center gap-1 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-2.5 py-1 rounded-lg font-code-sm text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'basic'
                ? 'bg-amber text-ink shadow-xs'
                : 'text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            123 &amp; Algebra
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calculus')}
            className={`px-2.5 py-1 rounded-lg font-code-sm text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calculus'
                ? 'bg-amber text-ink shadow-xs'
                : 'text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            ∫ Calculus (d/dx &amp; ∫)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('functions')}
            className={`px-2.5 py-1 rounded-lg font-code-sm text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'functions'
                ? 'bg-amber text-ink shadow-xs'
                : 'text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            f(x) Scientific
          </button>
        </div>
      </div>

      {/* Grid Keypad: Responsive gap and touch-friendly minimum touch targets */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5" aria-label="Scientific math keypad">
        {rows.map((row, rIdx) =>
          row.map((btn, cIdx) => {
            const isDelete = btn.action === 'delete';
            const isSpace = btn.action === 'space';
            return (
              <button
                key={`${rIdx}-${cIdx}-${btn.label}`}
                type="button"
                onClick={() => {
                  if (isDelete) onBackspace();
                  else if (isSpace) onInsert(' ');
                  else if (btn.value) onInsert(btn.value);
                }}
                className={`flex h-9 sm:h-10 items-center justify-center rounded-lg border border-hairline font-code-sm text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                  btn.span === 2 ? 'col-span-2' : ''
                } ${
                  isDelete
                    ? 'bg-surface-container text-error hover:bg-error-container/50'
                    : btn.highlight
                    ? 'bg-amber/20 border-amber/40 text-ink font-bold hover:bg-amber/30'
                    : 'bg-surface text-ink hover:bg-surface-container'
                }`}
                aria-label={isDelete ? 'Backspace' : isSpace ? 'Space' : `Insert ${btn.label}`}
              >
                {btn.label}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
