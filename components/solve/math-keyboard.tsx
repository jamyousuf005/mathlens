'use client';

import React from 'react';

const KEYS = [
  ['7', '8', '9', '+'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '*'],
  ['0', '.', 'x', '/'],
  ['(', ')', '^', '='],
  ['y', 'z', ' ', 'DEL'],
];

interface MathKeyboardProps {
  onInsert: (value: string) => void;
  onBackspace: () => void;
  className?: string;
}

export function MathKeyboard({ onInsert, onBackspace, className = '' }: MathKeyboardProps) {
  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`} aria-label="Math keyboard">
      {KEYS.flat().map((key) => {
        const isDelete = key === 'DEL';
        const isSpace = key === ' ';
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (isDelete) onBackspace();
              else onInsert(isSpace ? ' ' : key);
            }}
            className={`flex h-9 items-center justify-center rounded-lg border border-hairline font-code-sm text-xs font-semibold transition-colors cursor-pointer ${
              isDelete
                ? 'bg-surface-container text-error hover:bg-error-container/50'
                : 'bg-surface text-ink hover:bg-surface-container'
            }`}
            aria-label={isDelete ? 'Backspace' : isSpace ? 'Space' : `Insert ${key}`}
          >
            {isDelete ? 'Del' : isSpace ? 'Space' : key}
          </button>
        );
      })}
    </div>
  );
}
