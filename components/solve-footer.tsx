import React from 'react';

export default function SolveFooter() {
  return (
    <footer className="w-full bg-surface py-space-lg border-t border-hairline shadow-[0_-1px_6px_rgba(0,0,0,0.02)] mt-auto">
      <div className="w-full px-margin flex flex-col md:flex-row items-center justify-between gap-space-sm max-w-[1520px] mx-auto">
        <p className="font-code-sm text-code-sm text-ink-muted text-center md:text-left">
          MathLens v1.0 • Client-Side WebAssembly • Zero Remote Telemetry • Deterministic CAS Engine
        </p>
        <div className="flex items-center gap-space-md">
          <span className="font-caption text-caption text-ink-muted">Academic Computing Node</span>
          <span className="font-code-sm text-code-sm text-ink-muted">MIT EECS</span>
        </div>
      </div>
    </footer>
  );
}
