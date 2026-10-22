"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function WriteSolvePage() {
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [strokeWidth, setStrokeWidth] = useState<"fine" | "medium" | "bold">("medium");
  const [gridVisible, setGridVisible] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [copiedType, setCopiedType] = useState<"latex" | "text" | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [isCleared, setIsCleared] = useState(false);

  const handleCopyLatex = async () => {
    const text = "x^2 - 5x + 6 = 0 \\implies x \\in \\{2, 3\\}";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType("latex");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyText = async () => {
    const text = "x^2 - 5x + 6 = 0 => x = 2, x = 3 (Verified LHS = RHS = 0)";
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType("text");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleSolveClick = () => {
    setIsSolving(true);
    setIsCleared(false);
    setTimeout(() => {
      setIsSolving(false);
    }, 300);
  };

  const handleClearReset = () => {
    setIsCleared(true);
  };

  return (
          <div className="flex flex-col w-full">
            <div className="w-full px-margin py-space-lg max-w-[1520px] mx-auto flex flex-col gap-space-lg">
              {/* Editorial Title & Status Header */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pb-space-sm border-b border-hairline">
                <div className="flex flex-col gap-1.5 max-w-3xl">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-olive-tint-soft text-ink font-code-sm text-code-sm font-semibold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      METHOD 03 • VECTOR INKING CANVAS
                    </span>
                    <span className="font-code-sm text-code-sm text-ink-muted">CLIENT RUNTIME CAS v4.12</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-ink tracking-tight font-semibold">
                    Write Mathematical Problem &amp; Solve
                  </h1>
                  <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
                    Sketch or write mathematical equations with zero-latency stylus inking. Direct client-side Bézier vectorization and instant deterministic solution.
                  </p>
                </div>

                {/* Live Engine Telemetry Strip */}
                <div className="flex items-center gap-space-md bg-surface p-2.5 rounded-xl border border-hairline shadow-card self-start lg:self-auto">
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Execution Target</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sage"></span>
                      WASM Deterministic
                    </span>
                  </div>
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Latency</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink">0.84 ms</span>
                  </div>
                  <div className="flex flex-col px-space-xs">
                    <span className="font-caption text-caption text-ink-muted uppercase">Privacy Guarantee</span>
                    <span className="font-code-sm text-code-sm font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span> Local Only
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Academic Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                {/* LEFT COLUMN: Vector Inking Writepad (52%) */}
                <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-space-md">
                  {/* Canvas Studio Outer Card */}
                  <div className="bg-surface rounded-2xl border border-hairline shadow-sm overflow-hidden flex flex-col">
                    {/* Inking Top Toolbar */}
                    <div className="px-space-md py-space-sm bg-surface-container-low border-b border-hairline flex flex-wrap items-center justify-between gap-space-sm">
                      {/* Tool Selection & Stroke Weight */}
                      <div className="flex items-center gap-space-xs">
                        <div className="flex items-center bg-surface rounded-full p-0.5 border border-hairline">
                          <button
                            onClick={() => setTool('pen')}
                            className={`px-2.5 py-1 rounded-full font-caption text-caption font-medium flex items-center gap-1 transition-all cursor-pointer ${
                              tool === 'pen'
                                ? 'bg-[#1E231D] text-[#FFFFFF] shadow-sm'
                                : 'text-ink-muted hover:text-ink hover:bg-transparent'
                            }`}
                            id="tool-pen"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                            <span>Pen</span>
                          </button>
                          <button
                            onClick={() => setTool('eraser')}
                            className={`px-2.5 py-1 rounded-full font-caption text-caption font-medium flex items-center gap-1 transition-all cursor-pointer ${
                              tool === 'eraser'
                                ? 'bg-[#1E231D] text-[#FFFFFF] shadow-sm'
                                : 'text-ink-muted hover:text-ink hover:bg-transparent'
                            }`}
                            id="tool-eraser"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[15px]">ink_eraser</span>
                            <span>Eraser</span>
                          </button>
                        </div>

                        {/* Stroke Width Switcher */}
                        <div className="flex items-center bg-surface rounded-full p-1 border border-hairline ml-1 gap-1">
                          <button
                            onClick={() => setStrokeWidth('fine')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              strokeWidth === 'fine'
                                ? 'bg-surface-container-high border border-hairline'
                                : 'hover:bg-surface-container-low'
                            }`}
                            title="Fine (1.5px)"
                            type="button"
                            aria-label="Fine stroke"
                          >
                            <span
                              className="rounded-full shrink-0 bg-[#1E231D]"
                              style={{ width: '4px', height: '4px' }}
                            ></span>
                          </button>
                          <button
                            onClick={() => setStrokeWidth('medium')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              strokeWidth === 'medium'
                                ? 'bg-surface-container-high border border-hairline'
                                : 'hover:bg-surface-container-low'
                            }`}
                            title="Medium (2.5px)"
                            type="button"
                            aria-label="Medium stroke"
                          >
                            <span
                              className="rounded-full shrink-0 bg-[#1E231D]"
                              style={{ width: '7px', height: '7px' }}
                            ></span>
                          </button>
                          <button
                            onClick={() => setStrokeWidth('bold')}
                            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                              strokeWidth === 'bold'
                                ? 'bg-surface-container-high border border-hairline'
                                : 'hover:bg-surface-container-low'
                            }`}
                            title="Bold (4.0px)"
                            type="button"
                            aria-label="Bold stroke"
                          >
                            <span
                              className="rounded-full shrink-0 bg-[#1E231D]"
                              style={{ width: '10px', height: '10px' }}
                            ></span>
                          </button>
                        </div>
                      </div>

                      {/* History Actions & Grid Setting */}
                      <div className="flex items-center gap-space-xs">
                        <button
                          className="w-8 h-8 rounded-full border border-hairline bg-surface hover:bg-surface-container text-ink flex items-center justify-center transition-colors cursor-pointer"
                          id="undo-btn"
                          title="Undo stroke"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[17px]">undo</span>
                        </button>
                        <button
                          className="w-8 h-8 rounded-full border border-hairline bg-surface hover:bg-surface-container text-ink opacity-40 cursor-not-allowed flex items-center justify-center"
                          id="redo-btn"
                          title="Redo stroke"
                          type="button"
                          disabled
                        >
                          <span className="material-symbols-outlined text-[17px]">redo</span>
                        </button>
                        <div className="h-4 w-px bg-hairline mx-1"></div>
                        <button
                          onClick={() => setGridVisible(!gridVisible)}
                          className="px-2.5 py-1 rounded-full bg-surface border border-hairline font-code-sm text-code-sm text-ink hover:bg-surface-container flex items-center gap-1.5 transition-colors cursor-pointer"
                          id="grid-toggle-btn"
                          type="button"
                        >
                          <span className={`material-symbols-outlined text-[15px] ${gridVisible ? 'text-secondary' : 'text-ink-muted'}`}>grid_4x4</span>
                          <span className="hidden sm:inline">24mm Dot Grid</span>
                        </button>
                      </div>
                    </div>

                    {/* Main Inking Surface Viewport */}
                    <div
                      className="relative w-full h-[470px] bg-surface select-none overflow-hidden cursor-crosshair"
                      id="ink-canvas-container"
                    >
                      {/* Isometric / Cartesian 24mm Dot Matrix Background Pattern */}
                      {gridVisible && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern height="24" id="dot-pattern" patternUnits="userSpaceOnUse" width="24">
                              <circle cx="12" cy="12" fill="#1E231D" fillOpacity="0.25" r="1.15"></circle>
                            </pattern>
                            <pattern height="120" id="major-guide" patternUnits="userSpaceOnUse" width="120">
                              <path d="M 120 0 L 0 0 0 120" fill="none" stroke="#1E231D" strokeDasharray="2 4" strokeOpacity="0.08" strokeWidth="0.5"></path>
                            </pattern>
                          </defs>
                          <rect fill="url(#dot-pattern)" height="100%" width="100%"></rect>
                          <rect fill="url(#major-guide)" height="100%" width="100%"></rect>
                        </svg>
                      )}

                      {/* Organic Mathematical Ink Rendering: x² - 5x + 6 = 0 */}
                      {!isCleared && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300" fill="none" viewBox="0 0 700 470" xmlns="http://www.w3.org/2000/svg">
                          <line stroke="#1E231D" strokeDasharray="4 6" strokeOpacity="0.10" strokeWidth="1.2" x1="60" x2="640" y1="270" y2="270"></line>
                          <line stroke="#1E231D" strokeDasharray="2 4" strokeOpacity="0.06" strokeWidth="1" x1="60" x2="640" y1="180" y2="180"></line>
                          <path d="M 104 205 C 112 225, 128 250, 142 268" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4"></path>
                          <path d="M 140 206 C 130 226, 114 252, 102 267" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2"></path>
                          <path d="M 152 174 C 153 162, 168 159, 172 168 C 172 176, 156 186, 150 194 L 175 194" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.6"></path>
                          <path d="M 205 236 C 220 234.5, 235 235, 248 234" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.6"></path>
                          <path d="M 285 208 L 274 233 C 278 231, 298 230, 298 248 C 298 264, 280 269, 269 265" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.3"></path>
                          <path d="M 283 208 L 305 206" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.2"></path>
                          <path d="M 330 208 C 338 226, 354 249, 368 266" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.4"></path>
                          <path d="M 366 209 C 356 228, 341 251, 329 266" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.1"></path>
                          <path d="M 405 235 L 433 234" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.5"></path>
                          <path d="M 419 220 L 419 250" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.5"></path>
                          <path d="M 479 204 C 472 216, 459 238, 458 252 C 457 266, 477 269, 483 259 C 487 251, 482 240, 467 241" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.3"></path>
                          <path d="M 515 228 C 530 227.5, 544 227, 555 227" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.4"></path>
                          <path d="M 516 242 C 531 241.5, 545 241, 556 241" stroke="#1E231D" strokeLinecap="round" strokeWidth="3.4"></path>
                          <path d="M 602 214 C 585 214, 582 258, 600 262 C 616 264, 617 218, 602 214 Z" stroke="#1E231D" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.2"></path>
                        </svg>
                      )}

                      {/* Active Bézier Recognition Node Bounding Highlights */}
                      {!isCleared && (
                        <div className="absolute top-[148px] left-3 sm:left-[90px] right-3 sm:right-auto sm:w-[530px] h-[130px] rounded-xl border border-dashed border-amber/40 bg-amber/[0.02] pointer-events-none flex items-start justify-end p-1.5">
                          <span className="font-code-sm text-[10px] uppercase font-bold text-amber px-1.5 py-0.5 rounded bg-surface border border-amber/30">
                            Equation Token Array [10]
                          </span>
                        </div>
                      )}

                      {/* Floating Inking Telemetry Pill (Bottom-Left) */}
                      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 bg-surface/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-hairline shadow-sm max-w-[calc(100%-32px)]">
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
                        <span className="font-code-sm text-code-sm text-ink font-medium truncate">
                          {isCleared ? '0 strokes • Canvas cleared • Ready to ink' : '9 strokes • 120Hz Bezier sampling • Clean tokenization'}
                        </span>
                      </div>

                      {/* Canvas Quick Clear Icon Float */}
                      <button
                        onClick={handleClearReset}
                        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-surface border border-hairline text-ink-muted hover:text-error hover:bg-error-container/30 flex items-center justify-center transition-colors cursor-pointer"
                        id="quick-clear-canvas"
                        title="Clear Canvas"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">delete_sweep</span>
                      </button>
                    </div>
                  </div>

                  {/* Inking Bottom Action Dock */}
                  <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs">
                    <button
                      onClick={handleSolveClick}
                      className={`w-full sm:flex-1 h-14 rounded-full bg-amber text-ink font-headline-sm text-body-lg font-bold flex items-center justify-center gap-2.5 shadow-sm hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer ${
                        isSolving ? 'scale-95' : ''
                      }`}
                      id="solve-now-btn"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[22px]">bolt</span>
                      <span>Solve Problem Now</span>
                      <span className="font-caption text-caption text-ink/75 bg-ink/10 px-2.5 py-0.5 rounded-full font-medium">WASM 0.84ms</span>
                    </button>

                    <button
                      onClick={handleClearReset}
                      className="w-full sm:w-auto px-6 h-14 rounded-full bg-surface border border-hairline hover:bg-surface-container font-body-sm text-body-sm text-ink font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      id="clear-reset-btn"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                      <span>Clear &amp; Reset</span>
                    </button>
                  </div>

                  {/* Academic Inking Protocol Tips */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-space-sm py-2 rounded-xl bg-surface-container-low border border-hairline">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-ink-muted shrink-0">stylus_note</span>
                      <span className="font-caption text-caption text-ink-muted">Supports Apple Pencil, Surface Pen, Wacom, and Standard Inking</span>
                    </div>
                    <span className="font-code-sm text-code-sm text-ink-muted uppercase shrink-0 self-end sm:self-auto">Stroke smoothing: On</span>
                  </div>
                </div>

                {/* RIGHT COLUMN: Solution & Verification Pane (48%) */}
                <div className="lg:col-span-6 xl:col-span-6 flex flex-col gap-space-md">
                  <div className="bg-surface rounded-2xl border border-hairline shadow-sm p-space-lg flex flex-col gap-space-md">
                    {/* Top Classification Strip */}
                    <div className="flex items-center justify-between border-b border-hairline pb-space-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full bg-surface-container font-code-sm text-code-sm font-bold text-ink">
                          POLYNOMIAL DEGREE 2
                        </span>
                        <span className="font-caption text-caption text-ink-muted">x ∈ ℝ</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm font-semibold">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>AST RECOGNITION 99.8%</span>
                      </div>
                    </div>

                    {/* Real-Time Typeset Recognition Card */}
                    <div className="flex flex-col gap-1.5 p-space-md bg-canvas rounded-xl border border-hairline">
                      <div className="flex items-center justify-between">
                        <span className="font-caption text-caption font-semibold uppercase tracking-wider text-ink-muted">Recognized Expression</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage/20 text-secondary font-code-sm text-code-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          Valid AST
                        </span>
                      </div>
                      <div className="py-1 overflow-x-auto">
                        <span className="font-serif text-3xl font-normal text-ink tracking-wide select-all">
                          x² − 5x + 6 = 0
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted font-code-sm text-code-sm pt-1 border-t border-hairline">
                        <span>Canonical Form: <code className="text-ink font-semibold">ax² + bx + c = 0</code></span>
                        <span>•</span>
                        <span>Degree: 2</span>
                      </div>
                    </div>

                    {/* FINAL CANONICAL ROOTS HERO BOX */}
                    <div className="relative bg-surface rounded-xl border-2 border-amber p-space-md flex flex-col gap-space-sm bg-gradient-to-r from-surface via-surface to-primary-fixed/20 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-code-sm text-code-sm font-bold tracking-widest text-primary uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber"></span>Final Roots
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber/20 font-code-sm text-code-sm font-semibold text-on-primary-fixed-variant">
                          x ∈ &#123;2, 3&#125;
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <div className="font-serif text-4xl lg:text-5xl font-medium text-ink tracking-tight select-all">
                          x = 2, 3
                        </div>
                        <div className="font-code-input text-code-input text-ink-muted">
                          [ x₁ = 2 , x₂ = 3 ]
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-sage/15 border border-sage/30 text-ink">
                        <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                        <span className="font-caption text-caption text-ink font-semibold">✓ Verified by direct check • Exact integer roots</span>
                      </div>
                    </div>

                    {/* Step-by-Step Rigorous Derivation Steps */}
                    <div className="flex flex-col gap-space-xs">
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex flex-col">
                          <h2 className="font-headline-sm text-headline-sm text-ink font-semibold">Step-by-Step Solution</h2>
                          <p className="font-caption text-caption text-ink-muted">Simple, verified breakdown</p>
                        </div>
                        <span className="font-code-sm text-code-sm text-ink-muted px-2 py-0.5 rounded bg-surface-container">Factoring Method</span>
                      </div>

                      {/* Step 1 */}
                      <div className="p-space-md rounded-xl bg-surface-container-low border border-hairline flex flex-col gap-1.5 hover:bg-surface-container transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-amber text-surface font-code-sm text-code-sm font-bold flex items-center justify-center">1</span>
                            <span className="font-body-sm text-body-sm font-semibold text-ink">Identify standard terms</span>
                          </div>
                          <span className="font-code-sm text-[11px] text-ink-muted px-2 py-0.5 rounded bg-surface border border-hairline">standard form</span>
                        </div>
                        <div className="pl-space-lg flex flex-col gap-1 text-ink font-body-sm text-body-sm">
                          <p className="text-ink-muted">In standard quadratic form <code className="font-code-input text-ink font-medium">ax² + bx + c = 0</code>:</p>
                          <div className="flex items-center gap-2 font-code-input text-code-input mt-0.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-surface rounded border border-hairline font-medium">a = 1</span>
                            <span className="px-2 py-0.5 bg-surface rounded border border-hairline font-medium">b = −5</span>
                            <span className="px-2 py-0.5 bg-surface rounded border border-hairline font-medium">c = 6</span>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="p-space-md rounded-xl bg-surface-container-low border border-hairline flex flex-col gap-1.5 hover:bg-surface-container transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-amber text-surface font-code-sm text-code-sm font-bold flex items-center justify-center">2</span>
                            <span className="font-body-sm text-body-sm font-semibold text-ink">Find two numbers that multiply to 6 and add to −5</span>
                          </div>
                          <span className="font-code-sm text-[11px] text-ink-muted px-2 py-0.5 rounded bg-surface border border-hairline">factoring</span>
                        </div>
                        <div className="pl-space-lg flex flex-col gap-1 text-ink font-body-sm text-body-sm">
                          <p className="text-ink-muted">Look for factors of 6 whose sum is −5:</p>
                          <div className="flex flex-wrap items-center gap-2 font-code-input text-code-input text-ink">
                            <span className="px-2 py-0.5 bg-surface rounded border border-hairline font-medium">(−2) × (−3) = 6</span>
                            <span className="text-ink-muted">and</span>
                            <span className="px-2 py-0.5 bg-surface rounded border border-hairline font-medium">(−2) + (−3) = −5</span>
                          </div>
                          <p className="mt-1 font-serif text-[17px] text-ink">Therefore, rewrite the equation as: <span className="font-medium">(x − 2)(x − 3) = 0</span></p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="p-space-md rounded-xl bg-surface-container-low border border-hairline flex flex-col gap-1.5 hover:bg-surface-container transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-amber text-surface font-code-sm text-code-sm font-bold flex items-center justify-center">3</span>
                            <span className="font-body-sm text-body-sm font-semibold text-ink">Solve for each factor</span>
                          </div>
                          <span className="font-code-sm text-[11px] text-ink-muted px-2 py-0.5 rounded bg-surface border border-hairline">zero-product</span>
                        </div>
                        <div className="pl-space-lg flex flex-col sm:flex-row sm:items-center gap-3 text-ink font-body-sm text-body-sm">
                          <div className="flex items-center gap-2 font-serif text-[17px]">
                            <span className="bg-surface px-2.5 py-1 rounded border border-hairline font-medium">x − 2 = 0 ⟹ x = 2</span>
                          </div>
                          <div className="flex items-center gap-2 font-serif text-[17px]">
                            <span className="bg-surface px-2.5 py-1 rounded border border-hairline font-medium">x − 3 = 0 ⟹ x = 3</span>
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="p-space-md rounded-xl bg-olive-tint-soft border border-hairline flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-ink text-surface font-code-sm text-code-sm font-bold flex items-center justify-center">4</span>
                            <span className="font-body-sm text-body-sm font-semibold text-ink">Quick check</span>
                          </div>
                          <span className="font-code-sm text-[11px] text-secondary px-2 py-0.5 rounded bg-surface border border-sage/30 font-semibold">verified ✓</span>
                        </div>
                        <div className="pl-space-lg flex flex-col gap-1 text-ink font-body-sm text-body-sm">
                          <p className="text-ink-muted">Plug <code className="font-code-input text-ink font-medium">x = 2</code> and <code className="font-code-input text-ink font-medium">x = 3</code> back into <code className="font-code-input text-ink font-medium">x² − 5x + 6</code>:</p>
                          <div className="flex flex-wrap items-center gap-2 font-code-input text-code-sm text-ink">
                            <span className="px-2 py-1 bg-surface rounded border border-hairline">For x=2: (2)² − 5(2) + 6 = 4 − 10 + 6 = 0 ✓</span>
                            <span className="px-2 py-1 bg-surface rounded border border-hairline">For x=3: (3)² − 5(3) + 6 = 9 − 15 + 6 = 0 ✓</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client-Side Verification Terminal */}
                    <div className="flex flex-col gap-2 p-space-sm bg-ink rounded-xl text-surface">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber"></span>
                          <span className="font-code-sm text-code-sm text-surface/80 font-semibold uppercase tracking-wider">Formal Identity Check</span>
                        </div>
                        <span className="font-code-sm text-[11px] text-surface/50">WASM Kernel v4.12</span>
                      </div>
                      <div className="p-2.5 rounded bg-surface/5 font-code-sm text-code-sm flex flex-col gap-1.5 text-surface/90 border border-surface/10 select-all overflow-x-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-sage font-bold">✓</span>
                          <span>f(2) = (2)² − 5(2) + 6 = 4 − 10 + 6 = 0  <span className="text-sage">[Identity Satisfied]</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sage font-bold">✓</span>
                          <span>f(3) = (3)² − 5(3) + 6 = 9 − 15 + 6 = 0  <span className="text-sage">[Identity Satisfied]</span></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Row & Export Tools */}
                    <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1 border-t border-hairline">
                      <div className="flex flex-wrap items-center gap-space-xs">
                        <button
                          onClick={handleCopyLatex}
                          className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-ink font-code-sm text-code-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          id="copy-latex-btn"
                          type="button"
                        >
                          <span className={`material-symbols-outlined text-[15px] ${copiedType === 'latex' ? 'text-secondary' : ''}`}>
                            {copiedType === 'latex' ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedType === 'latex' ? 'Copied LaTeX!' : 'Copy LaTeX'}</span>
                        </button>

                        <button
                          onClick={handleCopyText}
                          className="px-3 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-ink font-code-sm text-code-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          id="copy-text-btn"
                          type="button"
                        >
                          <span className={`material-symbols-outlined text-[15px] ${copiedType === 'text' ? 'text-secondary' : ''}`}>
                            {copiedType === 'text' ? 'check' : 'article'}
                          </span>
                          <span>{copiedType === 'text' ? 'Copied Text!' : 'Copy Plaintext'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-space-xs">
                        <button
                          onClick={() => setIsStarred(!isStarred)}
                          className="p-2 rounded-full border border-hairline hover:bg-surface-container text-ink transition-colors cursor-pointer"
                          id="star-proof-btn"
                          title="Star Proof"
                          type="button"
                        >
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              isStarred ? 'text-amber' : ''
                            }`}
                            style={{ fontVariationSettings: isStarred ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            star
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            if (typeof window !== 'undefined') {
                              window.print();
                            }
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-surface border border-hairline hover:bg-surface-container font-body-sm text-body-sm font-semibold text-ink flex items-center gap-1.5 transition-colors cursor-pointer"
                          id="export-pdf-btn"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[17px]">picture_as_pdf</span>
                          <span>Export PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
  );
}
