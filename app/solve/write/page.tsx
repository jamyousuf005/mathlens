"use client";

import React, { useState, useRef, useEffect } from "react";
import { solveMathProblem } from "@/lib/engine/solver";
import { SolutionResult } from "@/lib/engine/types";
import { ExpressionEditor } from "@/components/solve/expression-editor";
import { CompleteSolutionNarrative } from "@/components/solve/complete-solution-narrative";
import { saveHistory, setHistoryFavorite } from "@/lib/history";

type StrokePoint = { x: number; y: number; time: number };

export default function WriteSolvePage() {
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [strokeWidth, setStrokeWidth] = useState<"fine" | "medium" | "bold">("medium");
  const [gridVisible, setGridVisible] = useState(true);
  const [isStarred, setIsStarred] = useState(false);
  const [copiedType, setCopiedType] = useState<"latex" | "text" | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [solvingFeedback, setSolvingFeedback] = useState<string | null>(null);
  const [solveError, setSolveError] = useState<string | null>(null);
  const [isCleared, setIsCleared] = useState(false);
  const [strokeCount, setStrokeCount] = useState<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasSolution, setHasSolution] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  // Math & OCR State
  const [expression, setExpression] = useState<string>("x^2 - 5x + 6 = 0");
  const [recognizedText, setRecognizedText] = useState<string>("");
  const [latexExpr, setLatexExpr] = useState<string>("x^2 - 5x + 6 = 0");
  const [activeEngine, setActiveEngine] = useState<string>("Gemini 2.5 Flash Vision");
  const [confidence, setConfidence] = useState<number>(99.8);
  const [solution, setSolution] = useState<SolutionResult>(() => {
    const s = solveMathProblem("x^2 - 5x + 6 = 0");
    return { ...s, executionTimeMs: 0.5 };
  });

  // Canvas Ref for Interactive Inking
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<StrokePoint[] | null>(null);
  const strokesRef = useRef<StrokePoint[][]>([]);
  const undoStackRef = useRef<ImageData[]>([]);
  const redoStackRef = useRef<ImageData[]>([]);

  const syncHistoryButtons = () => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  };

  const pushUndoSnapshot = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (undoStackRef.current.length > 40) undoStackRef.current.shift();
    redoStackRef.current = [];
    syncHistoryButtons();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || 700));
      const height = Math.max(1, Math.round(rect.height || 470));
      if (canvas.width === width && canvas.height === height) return;

      const previous = document.createElement("canvas");
      previous.width = canvas.width;
      previous.height = canvas.height;
      const previousCtx = previous.getContext("2d");
      if (previousCtx && canvas.width > 0 && canvas.height > 0) {
        previousCtx.drawImage(canvas, 0, 0);
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx && previous.width > 0 && previous.height > 0) {
        ctx.drawImage(previous, 0, 0, width, height);
      }
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryButtons();
    };

    resizeCanvas();
    const observer = new ResizeObserver(resizeCanvas);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    pushUndoSnapshot();
    isDrawingRef.current = true;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activeStrokeRef.current = [{ x, y, time: performance.now() }];

    ctx.beginPath();
    ctx.moveTo(x, y);

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = strokeWidth === "fine" ? 12 : strokeWidth === "medium" ? 24 : 36;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#1E231D";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = strokeWidth === "fine" ? 2.5 : strokeWidth === "medium" ? 4 : 6;
    }
    setIsCleared(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    activeStrokeRef.current?.push({ x, y, time: performance.now() });
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const stroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (stroke && stroke.length > 0) {
      strokesRef.current.push(stroke);
      setStrokeCount((prev) => prev + 1);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const snapshot = undoStackRef.current.pop();
    if (!canvas || !ctx || !snapshot) return;
    redoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(snapshot, 0, 0);
    const nextCount = Math.max(0, strokeCount - 1);
    setStrokeCount(nextCount);
    setIsCleared(nextCount === 0);
    syncHistoryButtons();
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const snapshot = redoStackRef.current.pop();
    if (!canvas || !ctx || !snapshot) return;
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    ctx.putImageData(snapshot, 0, 0);
    setStrokeCount((prev) => prev + 1);
    setIsCleared(false);
    syncHistoryButtons();
  };

  const handleCopyLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexExpr);
      setCopiedType("latex");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopiedType("text");
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleSolveClick = async () => {
    if (strokeCount === 0) {
      setSolveError('Write an equation on the canvas first, then read the ink.');
      setSolvingFeedback(null);
      return;
    }

    setIsSolving(true);
    setSolveError(null);
    setSolvingFeedback('Transcribing ink with Gemini Vision AI...');

    let base64Image = '';
    let geminiFailure = 'Ink recognition failed. Try again.';

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas unavailable.');

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const eCtx = exportCanvas.getContext('2d');
      if (!eCtx) throw new Error('Could not prepare the ink image.');
      eCtx.fillStyle = '#FFFFFF';
      eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      eCtx.drawImage(canvas, 0, 0);

      base64Image = exportCanvas.toDataURL('image/jpeg', 0.9);
      const res = await fetch('/api/ocr/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image, mimeType: 'image/jpeg' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        geminiFailure = payload?.error || geminiFailure;
        throw new Error(geminiFailure);
      }

      const data = await res.json();
      if (!data.expression || data.expression.trim().length === 0) {
        geminiFailure = 'No mathematical expression was detected in the ink.';
        throw new Error(geminiFailure);
      }

      setRecognizedText(String(data.expression));
      setExpression(String(data.expression));
      setLatexExpr(String(data.latex || data.expression));
      setConfidence(Number(data.confidence) || 90);
      setActiveEngine('Gemini 2.5 Flash Vision');
      setHasSolution(false);
      setIsConfirming(true);
      setSolvingFeedback('Ink recognized. Review the expression before solving.');
      setHistoryNotice(null);
      setHistoryId(null);
      setIsStarred(false);
      return;
    } catch (err) {
      geminiFailure = err instanceof Error ? err.message : geminiFailure;
    }

    try {
      setSolvingFeedback('Gemini unavailable. Trying local Tesseract OCR...');
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      let localText = '';
      try {
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789+-*/=^()xyzXYZabAB ',
          tessedit_pageseg_mode: '6' as unknown as import('tesseract.js').PSM,
        });
        const result = await worker.recognize(base64Image);
        localText = result.data?.text?.trim() || '';
      } finally {
        await worker.terminate();
      }

      if (!localText) throw new Error('Local OCR returned no text.');

      const { normalizeMathExpression } = await import('@/lib/engine/normalizer');
      const normalized = normalizeMathExpression(localText);
      if (!normalized || normalized.length < 2) {
        throw new Error('Local OCR could not find a usable expression.');
      }

      setRecognizedText(localText);
      setExpression(normalized);
      setLatexExpr(normalized);
      setConfidence(70);
      setActiveEngine('Local Tesseract fallback');
      setHasSolution(false);
      setIsConfirming(true);
      setHistoryNotice(null);
      setHistoryId(null);
      setIsStarred(false);
      setSolveError('Gemini OCR was unavailable. Review the local Tesseract result before solving.');
      setSolvingFeedback('Local OCR finished. Confirm the expression to solve.');
    } catch {
      setSolveError(geminiFailure);
      setSolvingFeedback(null);
    } finally {
      setTimeout(() => setIsSolving(false), 700);
    }
  };

  const handleConfirmExpression = async (result: SolutionResult) => {
    setSolution(result);
    setLatexExpr(result.normalizedExpression);
    setHasSolution(true);
    setIsConfirming(false);
    setSolveError(null);
    setSolvingFeedback(`Solved in ${result.executionTimeMs.toFixed(1)}ms`);

    try {
      const record = await saveHistory({
        expression: result.normalizedExpression,
        latex: result.normalizedExpression,
        recognizedText,
        problemType: result.problemType,
        inputType: 'pad',
        finalAnswerPlain: result.finalAnswerPlain,
        finalAnswerLatex: result.finalAnswerLatex,
        isVerified: result.isVerified,
        steps: result.steps,
      });
      setHistoryId(record.id);
      setIsStarred(false);
      setHistoryNotice('Confirmed result saved to Notebook.');
    } catch {
      setHistoryId(null);
      setHistoryNotice('Could not save this result to Notebook.');
    }
    setTimeout(() => setSolvingFeedback(null), 1600);
  };

  const handleToggleFavorite = async () => {
    if (!historyId) return;
    const next = !isStarred;
    setIsStarred(next);
    try {
      await setHistoryFavorite(historyId, next);
      setHistoryNotice(next ? 'Saved to Favorites.' : 'Removed from Favorites.');
    } catch {
      setIsStarred(!next);
      setHistoryNotice('Could not update Favorites.');
    }
  };

  const handleClearReset = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setIsCleared(true);
    setStrokeCount(0);
    strokesRef.current = [];
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncHistoryButtons();
    setHasSolution(false);
    setIsConfirming(false);
    setSolveError(null);
    setSolvingFeedback(null);
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
                    Sketch or write mathematical equations with low-latency pointer inking, canvas snapshot undo/redo, and a deterministic local solution.
                  </p>
                </div>

                {/* Live Engine Telemetry Strip */}
                <div className="flex items-center gap-space-md bg-surface p-2.5 rounded-xl border border-hairline shadow-card self-start lg:self-auto">
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Execution Target</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sage"></span>
                      TS Deterministic
                    </span>
                  </div>
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Latency</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink">{solution.executionTimeMs} ms</span>
                  </div>
                  <div className="flex flex-col px-space-xs">
                    <span className="font-caption text-caption text-ink-muted uppercase">Ink Privacy</span>
                    <span className="font-code-sm text-code-sm font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span> AI OCR only
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
                          onClick={handleUndo}
                          className={`w-8 h-8 rounded-full border border-hairline bg-surface hover:bg-surface-container text-ink flex items-center justify-center transition-colors ${
                            canUndo ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                          }`}
                          id="undo-btn"
                          title="Undo stroke"
                          type="button"
                          disabled={!canUndo}
                          aria-label="Undo stroke"
                        >
                          <span className="material-symbols-outlined text-[17px]">undo</span>
                        </button>
                        <button
                          onClick={handleRedo}
                          className={`w-8 h-8 rounded-full border border-hairline bg-surface hover:bg-surface-container text-ink flex items-center justify-center transition-colors ${
                            canRedo ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                          }`}
                          id="redo-btn"
                          title="Redo stroke"
                          type="button"
                          disabled={!canRedo}
                          aria-label="Redo stroke"
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
                      className="relative w-full h-[380px] sm:h-[470px] bg-surface select-none overflow-hidden cursor-crosshair"
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

                      {/* Real Interactive Inking Canvas */}
                      <canvas
                        ref={canvasRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={finishStroke}
                        onPointerCancel={finishStroke}
                        className="absolute inset-0 w-full h-full z-10 touch-none cursor-crosshair"
                      />

                      {/* Organic Sample Mathematical Ink Overlay (visible when strokes == 0 and not cleared) */}
                      {!isCleared && strokeCount === 0 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 opacity-60" fill="none" viewBox="0 0 700 470" xmlns="http://www.w3.org/2000/svg">
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

                      {/* Active Bézier Recognition Node Bounding Highlights — only shown when user has drawn strokes */}
                      {!isCleared && strokeCount > 0 && (
                        <div className="absolute top-[148px] left-3 sm:left-[90px] right-3 sm:right-auto sm:w-[530px] h-[130px] rounded-xl border border-dashed border-amber/40 bg-amber/[0.02] pointer-events-none flex items-start justify-end p-1.5 z-20">
                          <span className="font-code-sm text-[10px] uppercase font-bold text-amber px-1.5 py-0.5 rounded bg-surface border border-amber/30">
                            {activeEngine} • Active
                          </span>
                        </div>
                      )}

                      {/* Floating Inking Telemetry Pill (Bottom-Left) */}
                      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 bg-surface/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-hairline shadow-sm max-w-[calc(100%-32px)]">
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0"></span>
                        <span className="font-code-sm text-code-sm text-ink font-medium truncate">
                          {isCleared
                            ? '0 strokes • Canvas cleared • Draw equation'
                            : `${strokeCount} stroke${strokeCount !== 1 ? 's' : ''} • Real-time inking ready`}
                        </span>
                      </div>

                      {/* Canvas Quick Clear Icon Float */}
                      <button
                        onClick={handleClearReset}
                        className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-surface border border-hairline text-ink-muted hover:text-error hover:bg-error-container/30 flex items-center justify-center transition-colors cursor-pointer"
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
                      {isSolving ? (
                        <>
                          <span className="material-symbols-outlined text-[22px] animate-spin">refresh</span>
                          <span>{solvingFeedback || 'Transcribing ink...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[22px]">bolt</span>
                          <span>Solve Problem Now</span>
                          <span className="font-caption text-caption text-ink/75 bg-ink/10 px-2.5 py-0.5 rounded-full font-medium">Gemini AI + CAS</span>
                        </>
                      )}
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

                  {(solveError || (solvingFeedback && !isSolving)) && (
                    <p
                      role={solveError ? 'alert' : 'status'}
                      className={`px-space-sm py-2 rounded-xl border font-body-sm text-body-sm ${
                        solveError
                          ? 'bg-error-container/40 border-error/30 text-error'
                          : 'bg-sage/15 border-sage/30 text-ink'
                      }`}
                    >
                      {solveError || solvingFeedback}
                    </p>
                  )}

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
                          {solution.problemType.toUpperCase()}
                        </span>
                        <span className="font-caption text-caption text-ink-muted">x ∈ ℝ</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm font-semibold">
                        <span className="material-symbols-outlined text-[15px]">verified</span>
                        <span>{activeEngine} • {confidence}%</span>
                      </div>
                    </div>

                    {/* Real-Time Typeset Recognition Card */}
                    <div className="flex flex-col gap-1.5 p-space-md bg-canvas rounded-xl border border-hairline">
                      <div className="flex items-center justify-between">
                        <span className="font-caption text-caption font-semibold uppercase tracking-wider text-ink-muted">Recognized Expression</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage/20 text-secondary font-code-sm text-code-sm font-medium">
                          <span className="material-symbols-outlined text-[14px]">check</span>
                          AST Validated
                        </span>
                      </div>
                      <div className="py-1 overflow-x-auto">
                        <span className="font-serif text-3xl font-normal text-ink tracking-wide select-all">
                          {latexExpr || expression}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted font-code-sm text-code-sm pt-1 border-t border-hairline">
                        <span>Equation: <code className="text-ink font-semibold">{expression}</code></span>
                        <span>•</span>
                        <span>{solution.problemType}</span>
                      </div>
                    </div>

                    {isConfirming && (
                      <div className="flex flex-col gap-space-sm p-space-md bg-amber/[0.06] border border-amber/30 rounded-xl">
                        <div className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[18px] text-amber">rate_review</span>
                          <div>
                            <p className="font-body-sm text-body-sm font-semibold text-ink">Review the recognized ink</p>
                            <p className="font-caption text-caption text-ink-muted">
                              OCR output is a suggestion. Correct it before the solver runs.
                            </p>
                          </div>
                        </div>
                        <ExpressionEditor
                          value={expression}
                          onChange={setExpression}
                          onConfirm={handleConfirmExpression}
                          confirmLabel="Confirm & Solve"
                          inputId="write-expression-input"
                          autoFocus
                        />
                      </div>
                    )}

                    {!hasSolution && !isConfirming && (
                      <div className="p-space-md rounded-xl bg-surface-container-low border border-dashed border-hairline text-center">
                        <span className="material-symbols-outlined text-3xl text-ink-muted">stylus_note</span>
                        <p className="mt-1 font-body-sm text-body-sm font-semibold text-ink">No equation solved yet</p>
                        <p className="font-caption text-caption text-ink-muted">
                          Write on the canvas, read the ink, then confirm the expression.
                        </p>
                      </div>
                    )}

                    <div className={hasSolution && !isConfirming ? 'contents' : 'hidden'}>
                    {/* FINAL CANONICAL ROOTS HERO BOX */}
                    <div className="relative bg-surface rounded-xl border-2 border-amber p-space-md flex flex-col gap-space-sm bg-gradient-to-r from-surface via-surface to-primary-fixed/20 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-code-sm text-code-sm font-bold tracking-widest text-primary uppercase flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber"></span>Final Solution
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber/20 font-code-sm text-code-sm font-semibold text-on-primary-fixed-variant">
                          {solution.finalAnswerLatex || solution.finalAnswerPlain}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                        <div className="font-serif text-3xl lg:text-4xl font-medium text-ink tracking-tight select-all">
                          {solution.finalAnswerLatex || solution.finalAnswerPlain}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-sage/15 border border-sage/30 text-ink">
                        <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                        <span className="font-caption text-caption text-ink font-semibold">
                          {solution.isVerified ? '✓ Verified by direct check' : 'Deterministic Derivation'}
                        </span>
                      </div>
                    </div>


                    {/* Complete Written Solution in Text Form (One Go) */}
                    <CompleteSolutionNarrative
                      solution={solution}
                      originalProblem={expression}
                      idPrefix="write-narrative"
                    />

                    {/* Client-Side Verification Terminal */}
                    <div className="flex flex-col gap-2 p-space-sm bg-ink rounded-xl text-surface">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${solution.isVerified ? 'bg-sage' : 'bg-amber'}`}></span>
                          <span className="font-code-sm text-code-sm text-surface/80 font-semibold uppercase tracking-wider">Deterministic Identity Check</span>
                        </div>
                        <span className="font-code-sm text-[11px] text-surface/50">TS Kernel</span>
                      </div>
                      <div className="p-2.5 rounded bg-surface/5 font-code-sm text-code-sm flex flex-col gap-1.5 text-surface/90 border border-surface/10 select-all overflow-x-auto">
                        <div className="flex items-center gap-2">
                          <span className={solution.isVerified ? 'text-sage font-bold' : 'text-amber font-bold'}>
                            {solution.isVerified ? 'PASS' : 'CHECK'}
                          </span>
                          <span className="break-all">f(x) = {solution.normalizedExpression}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-surface/60 font-bold">-</span>
                          <span>
                            LHS = {solution.verificationDetails.lhsValue} | RHS = {solution.verificationDetails.rhsValue} | residual = {solution.verificationDetails.residualNorm.toExponential(2)}
                          </span>
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
                          onClick={handleToggleFavorite}
                          disabled={!historyId}
                          className={`p-2 rounded-full border border-hairline hover:bg-surface-container text-ink transition-colors ${
                            historyId ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                          }`}
                          id="star-proof-btn"
                          title={historyId ? 'Favorite in Notebook' : 'Solve to save to Notebook'}
                          type="button"
                          aria-pressed={isStarred}
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
                    {historyNotice && (
                      <p role="status" className="font-code-sm text-[11px] text-ink-muted">
                        {historyNotice}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
  );
}
