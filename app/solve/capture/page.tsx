"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function CaptureSolvePage() {
  const [cameraDevice, setCameraDevice] = useState("facetime");
  const [compositionGrid, setCompositionGrid] = useState(true);
  const [flashActive, setFlashActive] = useState(false);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [captureFeedbackText, setCaptureFeedbackText] = useState<string | null>(null);
  const [isCaptureStarred, setIsCaptureStarred] = useState(false);
  const [copiedCaptureType, setCopiedCaptureType] = useState<"latex" | "steps" | null>(null);

  const handleCaptureFeedback = () => {
    setIsProcessingCapture(true);
    setTimeout(() => {
      setCaptureFeedbackText("Solved in 0.62ms");
      setTimeout(() => {
        setIsProcessingCapture(false);
        setCaptureFeedbackText(null);
      }, 1800);
    }, 500);
  };

  const handleCopyCaptureLatex = async () => {
    try {
      await navigator.clipboard.writeText("x^2 - 5x + 6 = 0 \\implies x \\in \\{2, 3\\}");
      setCopiedCaptureType("latex");
      setTimeout(() => setCopiedCaptureType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyCaptureSteps = async () => {
    try {
      await navigator.clipboard.writeText("Standard Form: x^2 - 5x + 6 = 0\nFactorization: (x - 2)(x - 3) = 0\nRoots: x = 2, x = 3");
      setCopiedCaptureType("steps");
      setTimeout(() => setCopiedCaptureType(null), 1800);
    } catch {
      // fallback
    }
  };

  return (
          <div className="flex flex-col w-full">
            <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg max-w-[1520px] mx-auto">
              {/* Top Metadata & Header Section */}
              <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-hairline pb-space-sm">
                <div className="flex flex-col gap-1.5 max-w-3xl">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-olive-tint-soft text-ink font-code-sm text-code-sm font-semibold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber"></span>
                      METHOD 01 • WEBCAM &amp; OPTICAL SCANNER
                    </span>
                    <span className="font-code-sm text-code-sm text-ink-muted">CLIENT RUNTIME CAS v4.12</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-ink tracking-tight font-semibold">
                    Capture Photo &amp; Solve
                  </h1>
                  <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
                    Align any handwritten notes or printed textbook problem in front of your camera. Instant local frame capture, OCR segmentation, and deterministic analytical proof.
                  </p>
                </div>
                <div className="flex items-center gap-space-md bg-surface p-2.5 rounded-xl border border-hairline shadow-card self-start lg:self-auto">
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Execution Target</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sage"></span>
                      SymPy-WASM
                    </span>
                  </div>
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Latency</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink">0.62 ms</span>
                  </div>
                  <div className="flex flex-col px-space-xs">
                    <span className="font-caption text-caption text-ink-muted uppercase">Privacy Guarantee</span>
                    <span className="font-code-sm text-code-sm font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span> Local Only
                    </span>
                  </div>
                </div>
              </section>

              {/* Main Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                {/* LEFT COLUMN: Live Viewfinder & Optical Capture Engine (~52%) */}
                <section className="lg:col-span-6 flex flex-col gap-space-md">
                  {/* Viewfinder Outer Housing */}
                  <div className="relative w-full rounded-xl bg-ink overflow-hidden p-space-sm flex flex-col gap-space-sm shadow-md">
                    {/* Top Utility Bar within Camera HUD */}
                    <div className="relative z-20 flex items-center justify-between gap-space-sm px-space-sm py-1 bg-ink/80 backdrop-blur-md rounded-lg">
                      <div className="flex items-center gap-space-xs">
                        <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                        <span className="font-code-sm text-code-sm text-white tracking-wider">LIVE FEED</span>
                        <span className="hidden sm:inline font-code-sm text-code-sm text-surface-dim opacity-70">| DEV:0</span>
                      </div>
                      <div className="flex items-center gap-space-xs">
                        <div className="relative inline-block text-left">
                          <select
                            value={cameraDevice}
                            onChange={(e) => setCameraDevice(e.target.value)}
                            className="appearance-none bg-surface-container-highest/20 hover:bg-surface-container-highest/30 text-white font-code-sm text-code-sm py-1 pl-space-sm pr-7 rounded cursor-pointer transition-colors focus:outline-none max-w-[130px] sm:max-w-none truncate"
                            id="camera-select"
                          >
                            <option className="bg-ink text-white" value="facetime">FaceTime HD</option>
                            <option className="bg-ink text-white" value="external">Sony Alpha 4K</option>
                            <option className="bg-ink text-white" value="macro">Scanner</option>
                          </select>
                          <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1.5 text-white text-[16px]">expand_more</span>
                        </div>
                        <button
                          onClick={() => setCompositionGrid(!compositionGrid)}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
                            compositionGrid ? 'bg-amber text-ink' : 'bg-surface-container-highest/20 hover:bg-surface-container-highest/40 text-white'
                          }`}
                          id="grid-toggle-btn"
                          title="Toggle Composition Grid"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">grid_4x4</span>
                        </button>
                        <button
                          onClick={() => setFlashActive(!flashActive)}
                          className={`w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer ${
                            flashActive ? 'bg-amber text-ink' : 'bg-surface-container-highest/20 hover:bg-surface-container-highest/40 text-white'
                          }`}
                          id="flash-toggle-btn"
                          title="Toggle Contrast Illumination"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">flashlight_on</span>
                        </button>
                      </div>
                    </div>

                    {/* Camera Stream Simulation Canvas */}
                    <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-ink select-none flex items-center justify-center">
                      <div
                        className="absolute inset-0 bg-cover bg-center brightness-[0.92] contrast-[1.08] transition-transform duration-300"
                        style={{
                          backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBt68hWEVG72TdAuh8Y7q4hqn8skKXpdJg4Gt1EEFNJG5LW2SZ6MoD5-3tPdsMUFRLBTUcLtvvQsppFpx_WZLRQKU5a7k-GFguIvnd2WtrHy-YTKZXu0s966vjvDKXtCVjDlPDHKqQgIf9PFHpNs55jD3rLc-P5JfwdkYQlGw1bUsLhopkjqgyH0xtRwxFjdZa1knpB6pAwtXaqAN_NIbkxmMA287h_XpslJYCJVwCQMZbU2dBpZOfRHA')",
                        }}
                      ></div>

                      {/* Optical Grid Overlay */}
                      {compositionGrid && (
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25" id="composition-grid">
                          <div className="bg-surface/10"></div>
                          <div className="bg-surface/5"></div>
                          <div className="bg-surface/10"></div>
                          <div className="bg-surface/5"></div>
                          <div className="bg-surface/10"></div>
                          <div className="bg-surface/5"></div>
                          <div className="bg-surface/10"></div>
                          <div className="bg-surface/5"></div>
                          <div className="bg-surface/10"></div>
                        </div>
                      )}

                      {/* Viewfinder Center Scan Guidance Banner */}
                      <div className="absolute top-space-md left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                        <div className="px-space-md py-1 rounded-full bg-ink/80 backdrop-blur-md shadow-sm flex items-center gap-space-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber animate-ping"></span>
                          <span className="font-code-sm text-code-sm text-white tracking-tight">Align equation within amber corner guides</span>
                        </div>
                      </div>

                      {/* Precision Amber Corner Crop Targeting Frame */}
                      <div className="relative z-10 w-[78%] h-[58%] rounded flex items-center justify-center p-space-md pointer-events-none">
                        <div className="absolute top-0 left-0 w-8 h-8 flex flex-col justify-start">
                          <div className="w-8 h-[2px] bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                          <div className="w-[2px] h-8 bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                        </div>
                        <div className="absolute top-0 right-0 w-8 h-8 flex flex-col items-end">
                          <div className="w-8 h-[2px] bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                          <div className="w-[2px] h-8 bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 flex flex-col justify-end">
                          <div className="w-[2px] h-8 bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                          <div className="w-8 h-[2px] bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                        </div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 flex flex-col items-end justify-end">
                          <div className="w-[2px] h-8 bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                          <div className="w-8 h-[2px] bg-amber shadow-[0_0_8px_rgba(219,149,88,0.8)]"></div>
                        </div>

                        {/* Center Bounding Box Scan Line Animation */}
                        <div className="w-full h-full relative overflow-hidden rounded bg-amber/5 flex items-center justify-center">
                          <div className="absolute inset-x-0 h-0.5 bg-amber opacity-80 animate-[bounce_3s_infinite] shadow-[0_0_12px_rgba(219,149,88,1)]"></div>
                          <span className="font-code-sm text-code-sm text-amber font-mono bg-ink/70 px-2 py-0.5 rounded tracking-widest uppercase">
                            AST • LATEX DETECTED
                          </span>
                        </div>
                      </div>

                      {/* Optical Shutter Button Pin */}
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1">
                        <button
                          onClick={handleCaptureFeedback}
                          className="w-16 h-16 rounded-full bg-surface/20 backdrop-blur-md p-1 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer group"
                          id="shutter-trigger"
                          title="Capture Frame"
                          type="button"
                        >
                          <div className="w-full h-full rounded-full bg-amber flex items-center justify-center shadow-lg transition-colors group-hover:bg-primary-fixed">
                            <div className="w-6 h-6 rounded-full bg-ink flex items-center justify-center">
                              <span className="material-symbols-outlined text-amber text-[14px]">camera</span>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Realtime Telemetry HUD Footer */}
                      <div className="absolute bottom-space-xs inset-x-space-xs px-space-sm py-1 rounded bg-ink/80 backdrop-blur-sm flex items-center justify-between text-surface-dim font-code-sm text-code-sm">
                        <div className="flex items-center gap-space-sm">
                          <span className="flex items-center gap-1 text-secondary-fixed">
                            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                            30 FPS
                          </span>
                          <span className="hidden sm:inline text-surface-dim opacity-70">Sobel Edge Active</span>
                        </div>
                        <div className="flex items-center gap-space-sm">
                          <span className="text-surface-dim">ISO 100</span>
                          <span className="text-secondary-fixed">Contrast 100%</span>
                          <span className="font-mono text-amber">0.04ms</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Viewfinder Physical Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs">
                      <button
                        onClick={handleCaptureFeedback}
                        className="w-full sm:flex-1 h-14 rounded-full bg-amber text-ink font-headline-sm text-body-lg font-semibold flex items-center justify-center gap-space-xs hover:bg-primary-fixed active:scale-[0.99] transition-all shadow-sm cursor-pointer"
                        id="btn-primary-capture"
                        type="button"
                      >
                        {isProcessingCapture ? (
                          <>
                            <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                            <span>{captureFeedbackText || 'Processing Frame...'}</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[20px]">bolt</span>
                            <span>Capture &amp; Solve Instantly</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          const devices = ['facetime', 'external', 'macro'];
                          const nextIdx = (devices.indexOf(cameraDevice) + 1) % devices.length;
                          setCameraDevice(devices[nextIdx]);
                        }}
                        className="w-full sm:w-auto h-12 px-space-lg rounded-full bg-surface-container-highest/20 hover:bg-surface-container-highest/30 text-white font-body-sm text-body-sm transition-colors flex items-center justify-center gap-space-xs cursor-pointer"
                        id="btn-retake"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[18px]">cached</span>
                        <span>Retake / Switch</span>
                      </button>
                    </div>
                  </div>

                  {/* Privacy & Local CAS Statement Banner */}
                  <div className="rounded-xl bg-surface p-space-md shadow-sm flex items-start gap-space-md border border-hairline">
                    <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">enhanced_encryption</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <h2 className="font-headline-sm text-body-sm font-semibold text-ink">Zero Server Exfiltration Guaranteed</h2>
                      <p className="font-body-sm text-code-sm text-ink-muted">
                        Runs 100% in-browser via WebAssembly and WebRTC. Your camera feed and document scans never leave your local machine memory. Certified MIT Academic Sandbox compliance.
                      </p>
                    </div>
                  </div>

                  {/* Frame Diagnostic Strips (Image Processing Pipeline) */}
                  <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-sm border border-hairline">
                    <div className="flex items-center justify-between">
                      <span className="font-caption text-caption uppercase text-ink-muted tracking-wider font-semibold">Frame Processing Pipeline</span>
                      <span className="font-code-sm text-code-sm text-secondary">3 Stages Synchronized</span>
                    </div>
                    <div className="grid grid-cols-3 gap-space-sm">
                      <div className="flex flex-col gap-1">
                        <div className="h-14 rounded bg-surface-container overflow-hidden relative flex items-center justify-center">
                          <div
                            className="absolute inset-0 bg-cover bg-center grayscale contrast-200 opacity-80"
                            style={{
                              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAACRO64C2u2IJ-GOtt1NLcBrgr_CA-NRGmecBLdK8m_-4863gArQH4QzHFUfKMnwrUnP4Khx-5_1KsOLeHB6KUK_R0MQagTxNcKGTTqpNlq2jn1LPgfI1JLJzI29_rHaP80OaDC6pqXX61hwiLI-AtBk7tsnt41EmX20cFJfHp53PFsPEbL_HgpPYlzwc79yzRHAECrAUp1gf7r8B3aodgqUi7q20hWOcpZIBimGN0uqPXFv1UwE3T6w')",
                            }}
                          ></div>
                          <span className="relative z-10 font-code-sm text-caption bg-surface/80 px-1 py-0.5 rounded text-ink">1. Binarize</span>
                        </div>
                        <span className="font-caption text-caption text-ink-muted truncate">Otsu Thresholding</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="h-14 rounded bg-surface-container overflow-hidden relative flex items-center justify-center">
                          <div
                            className="absolute inset-0 bg-cover bg-center contrast-200 opacity-90"
                            style={{
                              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDNkZv6HwsZ7V_c1n4U0iYvNxxI1KoMcqE-ZOZ72GEH2qvpTQdb9wOInlH3LFpuqdbhuJMFpAsize5EShrObBptkC6wL2CUZ2Nc3FU1kcf6gMmMU1-2UouoVzjhaEd96Ic6DCJsgAX8_zvCGuUqHaElkx36igqo6qLxJmevS6jNWUWyzitXeulq-aECe9Ed1ReGACOaaPN-zt-UxSxnbnXaB0nidY_lPUOQVk0ylzUea9j-ZHflXcpmXQ')",
                            }}
                          ></div>
                          <span className="relative z-10 font-code-sm text-caption bg-ink/80 px-1 py-0.5 rounded text-white">2. Contours</span>
                        </div>
                        <span className="font-caption text-caption text-ink-muted truncate">Laplacian Mask</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="h-14 rounded bg-surface-container overflow-hidden relative flex items-center justify-center">
                          <div className="w-full h-full bg-secondary-fixed/30 flex items-center justify-center p-1">
                            <span className="font-code-sm text-code-sm font-semibold text-secondary">LaTeX AST</span>
                          </div>
                          <span className="relative z-10 font-code-sm text-caption bg-surface/80 px-1 py-0.5 rounded text-ink">3. Parse</span>
                        </div>
                        <span className="font-caption text-caption text-ink-muted truncate">MathJax Engine</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* RIGHT COLUMN: OCR Segmentation, Canonical Proof & Step-by-Step Derivation (~48%) */}
                <section className="lg:col-span-6 flex flex-col gap-space-md">
                  {/* OCR Extraction Status Header Card */}
                  <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-md border border-hairline">
                    <div className="flex items-center justify-between flex-wrap gap-space-xs">
                      <div className="flex items-center gap-space-xs">
                        <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-sm text-code-sm font-medium">
                          OCR Confidence: 99.4%
                        </span>
                        <span className="font-code-sm text-code-sm text-ink-muted">Tesseract-WASM v5.2</span>
                      </div>
                      <div className="flex items-center gap-1 text-secondary font-code-sm text-code-sm">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Symbolic Grammar Matched</span>
                      </div>
                    </div>

                    {/* Captured Segment Preview & Parsed Expression Bar */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm items-center p-space-sm rounded-lg bg-surface-container-low border border-hairline">
                      <div className="md:col-span-4 h-16 rounded overflow-hidden relative flex items-center justify-center bg-surface-container-high">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{
                            backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAicvng8bkIaCj4c4kjkdQrO3dWI042mZSjM17-8G_57A0f8mY_8fs9GzVJVT7cSp062Yz6PAkj4Go8SMtYxVFmnce5s_LlULvBbc596RpYADVII7ZI4ERdoQIfcFx_7y0EiYHhzaQUqUL2hNunJbdV8K_NkYdoARg_hnvgAv2axbnCyaP3GoawngUvCsHwxm5R-y4Mz2EQfbdaa83QEYtrfef3IQACXw-_0kLPX2RphmTj85iIyeGHFA')",
                          }}
                        ></div>
                        <div className="absolute inset-1 rounded bg-amber/15 shadow-[inset_0_0_0_1.5px_#DB9558]"></div>
                        <span className="relative z-10 font-code-sm text-[10px] bg-ink/80 text-amber px-1.5 py-0.2 rounded font-mono">ROI CROP</span>
                      </div>
                      <div className="md:col-span-8 flex flex-col justify-center px-space-xs">
                        <span className="font-caption text-caption text-ink-muted uppercase tracking-wider">Normalized Polynomial Expression</span>
                        <div className="flex items-center justify-between gap-space-sm pt-0.5">
                          <span className="font-headline-sm text-headline-sm text-ink tracking-normal font-serif italic">
                            x² − 5x + 6 = 0
                          </span>
                          <span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-code-sm text-caption font-semibold">
                            ✓ Validated
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Canonical Answer Hero Card */}
                  <div className="rounded-xl bg-surface p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-hairline">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-amber"></div>
                    <div className="flex items-center justify-between">
                      <span className="font-code-sm text-code-sm uppercase tracking-widest text-amber font-semibold">
                        Final Solution
                      </span>
                      <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-code-sm text-code-sm font-medium">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        ✓ Verified by direct check
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-sm py-space-xs">
                      <div className="flex items-baseline gap-space-md">
                        <span className="font-headline-xl text-headline-xl text-ink font-serif italic tracking-tight">
                          x = 2, 3
                        </span>
                        <span className="font-code-input text-code-input text-ink-muted font-mono">
                          S = &#123; 2, 3 &#125;
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs">
                        <span className="px-space-sm py-1 rounded bg-surface-container font-code-sm text-code-sm text-ink">
                          Roots: 2 Distinct Real
                        </span>
                      </div>
                    </div>
                    <div className="p-space-sm rounded-lg bg-olive-tint-soft flex items-center justify-between gap-space-sm">
                      <div className="flex items-center gap-space-xs text-secondary font-body-sm text-code-sm">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        <span>Both values satisfy x² − 5x + 6 = 0 exactly</span>
                      </div>
                      <span className="font-code-sm text-caption text-secondary shrink-0 font-medium">Local CAS Engine</span>
                    </div>
                  </div>

                  {/* Step-by-Step Rigorous Derivation Cards */}
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between px-space-xs">
                      <div>
                        <h2 className="font-headline-sm text-headline-sm text-ink font-semibold">Step-by-Step Solution</h2>
                        <p className="font-code-sm text-code-sm text-ink-muted">Simple, verified breakdown</p>
                      </div>
                      <span className="font-code-sm text-code-sm text-ink-muted">Form: ax² + bx + c = 0</span>
                    </div>

                    {/* Step 1 */}
                    <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-xs hover:bg-surface-bright transition-colors border border-hairline">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-6 h-6 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center">01</span>
                          <span className="font-headline-sm text-body-lg font-semibold text-ink">Identify standard terms</span>
                        </div>
                        <span className="font-code-sm text-caption text-ink-muted">Standard Form</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-ink-muted pl-8">
                        In x² − 5x + 6 = 0, we identify the coefficients:
                      </p>
                      <div className="ml-8 mt-1 p-space-sm rounded bg-surface-container-low font-code-input text-code-input text-ink font-mono flex items-center gap-space-md flex-wrap">
                        <span>a = 1</span>
                        <span className="text-ink-muted">•</span>
                        <span>b = -5</span>
                        <span className="text-ink-muted">•</span>
                        <span>c = 6</span>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-xs bg-gradient-to-r from-amber/5 via-surface to-surface border border-hairline">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-6 h-6 rounded-full bg-amber text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center">02</span>
                          <span className="font-headline-sm text-body-lg font-semibold text-ink">Find two numbers that multiply to 6 and add to -5</span>
                        </div>
                        <span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-code-sm text-caption font-semibold">Factoring Method</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-ink-muted pl-8">
                        Look for two integers that multiply to 6 (c) and sum to -5 (b):
                      </p>
                      <div className="ml-8 mt-1 p-space-sm rounded bg-surface-container font-code-input text-code-input text-ink font-mono flex flex-col gap-1">
                        <div>(-2) × (-3) = 6</div>
                        <div className="text-ink-muted">(-2) + (-3) = -5</div>
                        <div className="text-secondary text-code-sm pt-0.5">⇒ Rewrite equation as: (x − 2)(x − 3) = 0</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-xs hover:bg-surface-bright transition-colors border border-hairline">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-6 h-6 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center">03</span>
                          <span className="font-headline-sm text-body-lg font-semibold text-ink">Solve for each factor</span>
                        </div>
                        <span className="font-code-sm text-caption text-ink-muted">Zero Product Property</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-ink-muted pl-8">
                        Set each factor equal to zero to determine the roots:
                      </p>
                      <div className="ml-8 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                        <div className="p-space-sm rounded bg-surface-container-low flex flex-col">
                          <span className="font-caption text-caption text-ink-muted uppercase">First Factor</span>
                          <span className="font-code-input text-code-input text-ink font-mono">x − 2 = 0 ⟹ x = 2</span>
                        </div>
                        <div className="p-space-sm rounded bg-surface-container-low flex flex-col">
                          <span className="font-caption text-caption text-ink-muted uppercase">Second Factor</span>
                          <span className="font-code-input text-code-input text-ink font-mono">x − 3 = 0 ⟹ x = 3</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div className="rounded-xl bg-surface p-space-md shadow-sm flex flex-col gap-space-xs hover:bg-surface-bright transition-colors border border-hairline">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-space-sm">
                          <span className="w-6 h-6 rounded-full bg-amber/20 text-ink font-code-sm text-code-sm font-semibold flex items-center justify-center">04</span>
                          <span className="font-headline-sm text-body-lg font-semibold text-ink">Quick check</span>
                        </div>
                        <span className="font-code-sm text-caption text-secondary font-semibold">✓ Checked</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-ink-muted pl-8">
                        Plug x = 2 and x = 3 back into original equation x² − 5x + 6 = 0:
                      </p>
                      <div className="ml-8 mt-1 p-space-sm rounded bg-surface-container-low font-code-input text-code-input text-ink font-mono flex flex-col gap-1">
                        <div>x = 2: (2)² − 5(2) + 6 = 4 − 10 + 6 = 0 ✓</div>
                        <div>x = 3: (3)² − 5(3) + 6 = 9 − 15 + 6 = 0 ✓</div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Diagnostics Box */}
                  <div className="rounded-xl bg-ink text-white p-space-md flex flex-col gap-space-xs shadow-md">
                    <div className="flex items-center justify-between font-code-sm text-caption text-surface-dim">
                      <div className="flex items-center gap-space-xs">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span>MATHLENS_CAS_KERNEL::VERIFY</span>
                      </div>
                      <span className="font-mono">TIME: 0.62ms</span>
                    </div>
                    <div className="font-code-sm text-code-sm font-mono text-surface-container-highest/90 flex flex-col gap-0.5">
                      <div>&gt; f(x) := x^2 - 5*x + 6</div>
                      <div>&gt; eval(f, x=2) =&gt; 0.00e+00 [PASS]</div>
                      <div>&gt; eval(f, x=3) =&gt; 0.00e+00 [PASS]</div>
                      <div className="text-amber">&gt; Residual Norm ||r||_inf = 0.000000e+00 (Machine Epsilon Exact)</div>
                    </div>
                  </div>

                  {/* Utility Action Bar */}
                  <div className="flex items-center justify-between flex-wrap gap-space-sm pt-space-xs">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <button
                        onClick={handleCopyCaptureLatex}
                        className="px-space-md py-2 rounded-full bg-surface hover:bg-surface-container shadow-sm text-ink font-body-sm text-code-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-hairline"
                        id="copy-latex-btn"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedCaptureType === 'latex' ? 'check' : 'code'}
                        </span>
                        <span>{copiedCaptureType === 'latex' ? 'Copied LaTeX!' : 'Copy LaTeX'}</span>
                      </button>
                      <button
                        onClick={handleCopyCaptureSteps}
                        className="px-space-md py-2 rounded-full bg-surface hover:bg-surface-container shadow-sm text-ink font-body-sm text-code-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-hairline"
                        id="copy-img-btn"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copiedCaptureType === 'steps' ? 'check' : 'content_copy'}
                        </span>
                        <span>{copiedCaptureType === 'steps' ? 'Copied Steps!' : 'Copy Steps'}</span>
                      </button>
                      <button
                        onClick={() => setIsCaptureStarred(!isCaptureStarred)}
                        className={`w-9 h-9 rounded-full bg-surface hover:bg-surface-container shadow-sm text-ink flex items-center justify-center transition-colors cursor-pointer border border-hairline ${
                          isCaptureStarred ? 'text-amber' : ''
                        }`}
                        id="star-btn"
                        title="Bookmark Solution"
                        type="button"
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: isCaptureStarred ? "'FILL' 1" : "'FILL' 0" }}
                        >
                          {isCaptureStarred ? 'star' : 'star_border'}
                        </span>
                      </button>
                    </div>
                    <button
                      onClick={handleCaptureFeedback}
                      className="px-space-lg py-2 rounded-full bg-amber text-ink font-body-sm text-body-sm font-semibold flex items-center gap-1.5 hover:bg-primary-fixed transition-colors shadow-sm cursor-pointer"
                      id="solve-another-btn"
                      type="button"
                    >
                      <span>Solve Another</span>
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
  );
}
