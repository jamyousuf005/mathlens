"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function UploadSolvePage() {
  const [uploadRotation, setUploadRotation] = useState(0);
  const [isUploadInverted, setIsUploadInverted] = useState(false);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [uploadFeedbackText, setUploadFeedbackText] = useState<string | null>(null);
  const [isUploadStarred, setIsUploadStarred] = useState(false);
  const [copiedUploadType, setCopiedUploadType] = useState<"latex" | "plain" | null>(null);

  const handleCopyUploadLatex = async () => {
    try {
      await navigator.clipboard.writeText("\\int x \\cdot \\sin(x)\\,dx = -x\\cos(x) + \\sin(x) + C");
      setCopiedUploadType("latex");
      setTimeout(() => setCopiedUploadType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyUploadPlain = async () => {
    try {
      await navigator.clipboard.writeText("Integral x * sin(x) dx = -x*cos(x) + sin(x) + C");
      setCopiedUploadType("plain");
      setTimeout(() => setCopiedUploadType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleUploadFeedback = () => {
    setIsAnalyzingUpload(true);
    setTimeout(() => {
      setUploadFeedbackText("Analysis complete in 0.45s");
      setTimeout(() => {
        setIsAnalyzingUpload(false);
        setUploadFeedbackText(null);
      }, 1800);
    }, 600);
  };

  const handleAnalyzeUpload = handleUploadFeedback;

  return (
          <div className="flex flex-col w-full">
            <div className="w-full px-margin py-space-lg max-w-[1520px] mx-auto flex flex-col gap-space-lg">
              {/* Header Section */}
              <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md border-b border-hairline pb-space-sm">
                <div className="flex flex-col gap-1.5 max-w-3xl">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-olive-tint-soft text-ink font-code-sm text-code-sm font-semibold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                      METHOD 02 • IMAGE FILE &amp; DOCUMENT INGESTION
                    </span>
                    <span className="font-code-sm text-code-sm text-ink-muted">CLIENT RUNTIME CAS v4.12</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl tracking-tight text-ink font-semibold">
                    Upload Photo &amp; Solve
                  </h1>
                  <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
                    Drag and drop or browse photos of worksheets, scanned textbook pages, screenshots, or PNG/JPEG images for instant mathematical solving.
                  </p>
                </div>
                <div className="flex items-center gap-space-md bg-surface p-2.5 rounded-xl border border-hairline shadow-card self-start lg:self-auto">
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Execution Target</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sage"></span>
                      SymEngine WASM
                    </span>
                  </div>
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Latency</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink">0.45 s</span>
                  </div>
                  <div className="flex flex-col px-space-xs">
                    <span className="font-caption text-caption text-ink-muted uppercase">Privacy Guarantee</span>
                    <span className="font-code-sm text-code-sm font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span> Local Only
                    </span>
                  </div>
                </div>
              </section>

              {/* Main Two-Column Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                {/* LEFT COLUMN: Inspector & Dropzone (~52%) */}
                <section className="lg:col-span-6 flex flex-col gap-space-md">
                  {/* Main Image Card Container */}
                  <div className="bg-surface rounded-xl shadow-sm p-space-md flex flex-col gap-space-md border border-hairline">
                    {/* Image Viewport with Bounding Box & Canvas Emulation */}
                    <div className="relative w-full rounded-lg overflow-hidden bg-surface-container-low min-h-[380px] flex items-center justify-center p-4">
                      {/* Real photo placeholder of handwritten math note on grid paper */}
                      <img
                        className={`w-full h-80 object-cover rounded shadow-inner transition-all duration-300 ${
                          isUploadInverted ? 'invert hue-rotate-180' : ''
                        }`}
                        style={{ transform: `rotate(${uploadRotation}deg)` }}
                        alt="Handwritten calculus worksheet with quadratic equation x^2 - 5x + 6 = 0"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDRyP8JziTWzfAn9NRXPrubGscijbTCcbNlcIwlk2YeX7w7x4qOwK88VxAiXWmmAGogb8a1M38Yor_O4eaNpegGtU8NcCpLZdrjxeNDQBjrvz17QHnsLjIZqpbrjTfnJ1UzbG-G8DiJWNoM0SbtcblsnO1mlt_CKLFX5zcDi-UAju4moEGlSTzYfOFKbTmzGMJ6UQyOvcwMB4Yf5ZPjpBcnVYuD1iClrZjSVvKNsH9tQOCLZCqHxCCBcg"
                      />
                      {/* Visual Scrim & Grid Guideline Overlay */}
                      <div className="absolute inset-0 bg-ink/5 pointer-events-none"></div>

                      {/* OCR Bounding Box Indicator */}
                      <div className="absolute inset-x-8 top-16 bottom-16 rounded-lg bg-amber/10 pointer-events-none flex flex-col justify-between p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber text-ink font-code-sm text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">crop_free</span>
                            ROI #01 • Quadratic
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface/90 text-ink font-code-sm text-[10px] backdrop-blur-sm shadow-xs">
                            99.8% Match
                          </span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="font-code-sm text-[10px] text-ink bg-surface/90 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-xs">
                            Orientation: {uploadRotation}.00° • Clean
                          </span>
                          <span className="w-2.5 h-2.5 bg-amber rounded-full ring-2 ring-white/80"></span>
                        </div>
                      </div>

                      {/* Focus Corners */}
                      <div className="absolute top-14 left-6 w-4 h-4 border-t-2 border-l-2 border-amber pointer-events-none"></div>
                      <div className="absolute top-14 right-6 w-4 h-4 border-t-2 border-r-2 border-amber pointer-events-none"></div>
                      <div className="absolute bottom-14 left-6 w-4 h-4 border-b-2 border-l-2 border-amber pointer-events-none"></div>
                      <div className="absolute bottom-14 right-6 w-4 h-4 border-b-2 border-r-2 border-amber pointer-events-none"></div>
                    </div>

                    {/* File Metadata Ribbon */}
                    <div className="flex flex-wrap items-center justify-between gap-space-xs p-space-sm rounded-lg bg-surface-container-low font-code-sm text-code-sm text-ink border border-hairline">
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-outline text-[18px]">draft</span>
                        <span className="font-medium truncate">calc_worksheet_problem_04.png</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted">
                        <span>1.4 MB</span>
                        <span>•</span>
                        <span>2400×1600 px</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.5 rounded bg-surface font-semibold text-ink shadow-xs">300 DPI</span>
                      </div>
                    </div>

                    {/* Quick Image Manipulation Toolbar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      <button
                        onClick={() => setUploadRotation((prev) => (prev + 90) % 360)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-ink font-body-sm text-body-sm font-medium cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">rotate_right</span>
                        <span>Rotate 90°</span>
                      </button>
                      <button
                        onClick={() => {}}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-ink font-body-sm text-body-sm font-medium cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">crop</span>
                        <span>Crop Equation</span>
                      </button>
                      <button
                        onClick={() => setIsUploadInverted((prev) => !prev)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full transition-colors font-body-sm text-body-sm font-medium cursor-pointer ${
                          isUploadInverted
                            ? 'bg-ink text-surface'
                            : 'bg-surface-container hover:bg-surface-container-high text-ink'
                        }`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">invert_colors</span>
                        <span>Invert</span>
                      </button>
                      <button
                        onClick={() => {
                          setUploadRotation(0);
                          setIsUploadInverted(false);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-ink font-body-sm text-body-sm font-medium cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">sync</span>
                        <span>Reset Image</span>
                      </button>
                    </div>

                    {/* Drag and Drop Active Receptor Area */}
                    <div className="rounded-lg p-space-md flex flex-col items-center justify-center text-center gap-2 bg-canvas/70 hover:bg-canvas transition-colors cursor-pointer group border border-hairline border-dashed">
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-medium text-ink">
                          Drag new image here, or <span className="text-primary underline cursor-pointer">browse filesystem</span>
                        </span>
                        <span className="font-code-sm text-code-sm text-ink-muted">
                          Accepts PNG, JPG, WebP, SVG, MathML, or single-page PDF
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Dock */}
                  <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-2">
                    <button
                      onClick={handleAnalyzeUpload}
                      className="w-full sm:flex-1 h-[54px] rounded-full bg-amber hover:brightness-105 active:scale-[0.99] transition-all text-ink font-semibold font-body-lg text-body-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      type="button"
                    >
                      {isAnalyzingUpload ? (
                        <>
                          <span className="material-symbols-outlined text-[22px] animate-spin">refresh</span>
                          <span>{uploadFeedbackText || 'Analyzing Uploaded Frame...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[22px]">bolt</span>
                          <span>Analyze &amp; Solve Uploaded Photo</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {}}
                      className="w-full sm:w-auto h-[54px] px-space-md rounded-full bg-surface hover:bg-surface-container transition-colors text-ink font-body-sm text-body-sm font-medium flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-hairline"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">folder_zip</span>
                      <span className="whitespace-nowrap">Batch Upload Worksheets</span>
                    </button>
                  </div>

                  {/* Local CAS Privacy Assurance Card */}
                  <div className="p-space-md rounded-xl bg-surface-container-low flex items-start gap-space-sm border border-hairline">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">verified_user</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-headline-sm text-[14px] leading-tight font-semibold text-ink">Air-Gapped Client Ingestion</span>
                      <p className="font-body-sm text-[13px] leading-relaxed text-ink-muted">
                        Photographs are binarized and parsed via WebAssembly on your hardware. Pixels never leave this browser tab, adhering to academic privacy and FERPA constraints.
                      </p>
                    </div>
                  </div>
                </section>

                {/* RIGHT COLUMN: Extracted Math, Solution & Verification (~48%) */}
                <section className="lg:col-span-6 flex flex-col gap-space-md">
                  {/* Ingestion Status Header */}
                  <div className="flex items-center justify-between px-space-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sage"></span>
                      <span className="font-code-sm text-code-sm uppercase tracking-wider text-ink font-semibold">
                        Client-Side OCR Ingestion • Parser Ready
                      </span>
                    </div>
                    <span className="font-code-sm text-code-sm text-ink-muted">Latency: 18ms</span>
                  </div>

                  {/* Extracted Formula & LaTeX Viewport */}
                  <div className="bg-surface rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm border border-hairline">
                    <div className="flex items-center justify-between">
                      <span className="font-caption text-caption uppercase text-ink-muted tracking-wider">Recognized Math Expression</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage text-ink font-body-sm text-[12px] font-medium">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        AST Validated
                      </span>
                    </div>
                    {/* Typeset Formula in Classical Display Style */}
                    <div className="py-space-md px-space-lg rounded-lg bg-canvas/60 flex items-center justify-center text-center border border-hairline">
                      <span className="font-serif text-3xl md:text-4xl tracking-wide text-ink select-all">
                        x² − 5x + 6 = 0
                      </span>
                    </div>
                    {/* Raw LaTeX Code Line with Copy Shortcut */}
                    <div className="flex items-center justify-between gap-space-sm p-2 rounded-lg bg-surface-container-low font-code-input text-code-input text-ink border border-hairline">
                      <div className="flex items-center gap-2 truncate pl-1">
                        <span className="text-outline text-xs select-none">LaTeX:</span>
                        <code className="font-code-input text-[13px] select-all truncate text-ink">x^2 - 5x + 6 = 0</code>
                      </div>
                      <button
                        onClick={handleCopyUploadLatex}
                        className="px-2.5 py-1 rounded bg-surface hover:bg-surface-container font-code-sm text-code-sm text-ink transition-colors flex items-center gap-1 shadow-sm shrink-0 cursor-pointer border border-hairline"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedUploadType === 'latex' ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedUploadType === 'latex' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Canonical Result Hero Box */}
                  <div className="bg-surface rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-hairline">
                    <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber text-[20px]">workspace_premium</span>
                        <span className="font-code-sm text-code-sm uppercase font-semibold text-ink tracking-wider">Final Canonical Roots</span>
                      </div>
                      <span className="font-code-sm text-code-sm text-ink-muted">Degree: 2 • Quadratic</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-caption text-caption uppercase text-ink-muted">Exact Roots</span>
                        <div className="font-serif text-4xl lg:text-5xl font-medium text-ink pt-1 tracking-tight select-all">
                          x = 2, 3
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end">
                        <span className="font-caption text-caption uppercase text-ink-muted">Decimal Expansion</span>
                        <span className="font-code-input text-code-input font-medium text-ink pt-1">
                          x₁ = 2.000000<br />x₂ = 3.000000
                        </span>
                      </div>
                    </div>
                    <div className="p-space-sm rounded-lg bg-secondary-fixed/40 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-ink">
                        <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                        <span className="font-body-sm text-[13px] font-medium">✓ Verified by direct check (LHS = RHS = 0)</span>
                      </div>
                      <span className="font-code-sm text-code-sm font-semibold text-secondary">Exact Integer Solution</span>
                    </div>
                  </div>

                  {/* Rigorous Step Derivations */}
                  <div className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between px-space-xs py-1">
                      <span className="font-caption text-caption uppercase font-semibold text-ink-muted tracking-wider">Step-by-Step Solution</span>
                      <span className="font-caption text-caption text-ink-muted">Simple, verified breakdown</span>
                    </div>

                    {/* Step 1 */}
                    <div className="bg-surface rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-hairline">
                      <div className="w-7 h-7 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        01
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm text-body-sm font-semibold text-ink">Identify standard terms</span>
                          <span className="font-code-sm text-[11px] text-ink-muted bg-surface-container px-1.5 py-0.5 rounded border border-hairline">standard form</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-ink-muted">Match with standard quadratic form <code className="font-code-sm text-ink">ax² + bx + c = 0</code>:</p>
                        <div className="p-2 rounded bg-surface-container-low font-code-input text-[13px] text-ink border border-hairline">
                          a = 1, &nbsp; b = −5, &nbsp; c = 6
                        </div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="bg-surface rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-hairline">
                      <div className="w-7 h-7 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        02
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm text-body-sm font-semibold text-ink">Find numbers that multiply to 6 and add to −5</span>
                          <span className="font-code-sm text-[11px] text-ink-muted bg-surface-container px-1.5 py-0.5 rounded border border-hairline">factoring</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-ink-muted">Look for two integer factors of 6 that sum to −5:</p>
                        <div className="p-2 rounded bg-surface-container-low font-code-input text-[13px] text-ink border border-hairline">
                          (−2) × (−3) = 6 &nbsp;and&nbsp; (−2) + (−3) = −5 &nbsp;⟹&nbsp; (x − 2)(x − 3) = 0
                        </div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="bg-surface rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-hairline">
                      <div className="w-7 h-7 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        03
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm text-body-sm font-semibold text-ink">Solve for each factor</span>
                          <span className="font-code-sm text-[11px] text-ink-muted bg-surface-container px-1.5 py-0.5 rounded border border-hairline">roots</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-ink-muted">Set each linear factor equal to zero:</p>
                        <div className="p-2 rounded bg-surface-container-low font-code-input text-[13px] text-ink border border-hairline">
                          x − 2 = 0 ⟹ x = 2 &nbsp;&nbsp;and&nbsp;&nbsp; x − 3 = 0 ⟹ x = 3
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="bg-surface rounded-xl p-space-md shadow-sm flex items-start gap-space-md border border-hairline">
                      <div className="w-7 h-7 rounded-full bg-amber text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        04
                      </div>
                      <div className="flex flex-col gap-1 w-full min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-body-sm text-body-sm font-semibold text-ink">Quick check</span>
                          <span className="font-code-sm text-[11px] text-ink-muted bg-surface-container px-1.5 py-0.5 rounded border border-hairline">verification</span>
                        </div>
                        <p className="font-body-sm text-body-sm text-ink-muted">Plug both values back into original equation:</p>
                        <div className="p-2 rounded bg-surface-container-low font-code-input text-[13px] text-ink flex items-center justify-between border border-hairline">
                          <span>(2)² − 5(2) + 6 = 4 − 10 + 6 = 0 ✓ &nbsp;&amp;&nbsp; (3)² − 5(3) + 6 = 9 − 15 + 6 = 0 ✓</span>
                          <span className="font-serif italic font-bold text-ink">Q.E.D.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Client-Side WASM Verification Audit Log */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-2 font-code-input text-[12px] border border-hairline">
                    <div className="flex items-center justify-between text-ink-muted pb-1 border-b border-hairline font-code-sm">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        Deterministic Verification Audit (Client-Side)
                      </span>
                      <span>Proof Hash: #0x82b4f9</span>
                    </div>
                    <p className="text-secondary font-code-sm">
                      // Testing root candidate x = 2 ➔ f(2) = (2)² − 5(2) + 6 = 4 − 10 + 6 = 0 ✓ Identity satisfied
                    </p>
                    <p className="text-secondary font-code-sm">
                      // Testing root candidate x = 3 ➔ f(3) = (3)² − 5(3) + 6 = 9 − 15 + 6 = 0 ✓ Identity satisfied
                    </p>
                    <p className="text-ink-muted font-code-sm">
                      // Symbolic check: Expand[(x-2)(x-3)] - (x^2 - 5x + 6) ➔ Null remainder [0]
                    </p>
                  </div>

                  {/* Action Row Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-space-xs pt-1 border-t border-hairline">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <button
                        onClick={handleCopyUploadLatex}
                        className="px-3.5 py-2 rounded-full bg-surface hover:bg-surface-container transition-colors text-ink font-body-sm text-body-sm font-medium flex items-center gap-1.5 shadow-sm cursor-pointer border border-hairline"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">terminal</span>
                        <span>{copiedUploadType === 'latex' ? 'Copied LaTeX!' : 'Copy LaTeX'}</span>
                      </button>
                      <button
                        onClick={handleCopyUploadPlain}
                        className="px-3.5 py-2 rounded-full bg-surface hover:bg-surface-container transition-colors text-ink font-body-sm text-body-sm font-medium flex items-center gap-1.5 shadow-sm cursor-pointer border border-hairline"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">notes</span>
                        <span>{copiedUploadType === 'plain' ? 'Copied Plaintext!' : 'Copy Plaintext'}</span>
                      </button>
                      <button
                        onClick={() => setIsUploadStarred((prev) => !prev)}
                        className={`px-3.5 py-2 rounded-full bg-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm font-medium flex items-center gap-1.5 shadow-sm cursor-pointer border border-hairline ${
                          isUploadStarred ? 'text-amber' : 'text-ink'
                        }`}
                        type="button"
                      >
                        <span
                          className="material-symbols-outlined text-[16px]"
                          style={{ fontVariationSettings: isUploadStarred ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          star
                        </span>
                        <span>{isUploadStarred ? 'Starred' : 'Star Problem'}</span>
                      </button>
                    </div>
                    <button
                      onClick={handleAnalyzeUpload}
                      className="px-4 py-2 rounded-full bg-amber hover:brightness-105 active:scale-[0.99] transition-all text-ink font-body-sm text-body-sm font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      type="button"
                    >
                      <span>Solve Another</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </section>
              </div>

              {/* Related Document Ingestion Queue */}
              <section className="mt-space-lg pt-space-lg border-t border-hairline flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">photo_library</span>
                    <span className="font-headline-sm text-headline-sm text-ink font-semibold">Recent Document Ingestion Queue</span>
                  </div>
                  <span className="font-code-sm text-code-sm text-ink-muted">4 Files Processed in Session</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
                  {/* Queue Card 1 */}
                  <div className="p-space-md rounded-xl bg-surface shadow-sm flex flex-col justify-between gap-space-md group hover:bg-surface-container-low transition-colors border border-hairline">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-body-sm font-semibold text-ink truncate">midterm_sample_q12.jpg</span>
                        <span className="font-caption text-caption text-ink-muted">Integration by Parts • 2.1 MB</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-[11px] font-semibold">SOLVED</span>
                    </div>
                    <div className="p-2 rounded bg-canvas/70 font-serif text-lg text-ink truncate border border-hairline">
                      ∫ x · e^(2x) dx = ½ x e^(2x) − ¼ e^(2x) + C
                    </div>
                  </div>
                  {/* Queue Card 2 */}
                  <div className="p-space-md rounded-xl bg-surface shadow-sm flex flex-col justify-between gap-space-md group hover:bg-surface-container-low transition-colors border border-hairline">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-body-sm font-semibold text-ink truncate">textbook_matrix_p104.png</span>
                        <span className="font-caption text-caption text-ink-muted">Eigenvalue Decomposition • 840 KB</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-[11px] font-semibold">SOLVED</span>
                    </div>
                    <div className="p-2 rounded bg-canvas/70 font-serif text-lg text-ink truncate border border-hairline">
                      det(A − λI) = 0 ⟹ λ₁ = 4, λ₂ = −1
                    </div>
                  </div>
                  {/* Queue Card 3 */}
                  <div className="p-space-md rounded-xl bg-surface shadow-sm flex flex-col justify-between gap-space-md group hover:bg-surface-container-low transition-colors border border-hairline">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-body-sm font-semibold text-ink truncate">board_photo_oct24.png</span>
                        <span className="font-caption text-caption text-ink-muted">First Order ODE • 3.2 MB</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-caption text-[11px] font-semibold">SOLVED</span>
                    </div>
                    <div className="p-2 rounded bg-canvas/70 font-serif text-lg text-ink truncate border border-hairline">
                      dy/dx + 2y = 4 ⟹ y(x) = 2 + C·e^(−2x)
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
  );
}
