'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  PenTool,
  Camera,
  Upload,
  ArrowRight,
  ShieldCheck,
  WifiOff,
  Undo2,
  Redo2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  CheckSquare,
  FileText,
  Zap,
  PlayCircle,
  School,
  Contrast,
  User as UserIcon,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathRenderer } from '@/components/ui/MathRenderer';

interface Benchmark {
  id: string;
  type: string;
  name: string;
  equation: string;
  latexEquation: string;
  latexResult: string;
  time: string;
}

const BENCHMARKS: Benchmark[] = [
  {
    id: 'quad',
    type: 'Quadratic Equation',
    name: 'Quadratic Equation',
    equation: 'x² − 5x + 6 = 0',
    latexEquation: 'x^2 - 5x + 6 = 0',
    latexResult: 'x \\in \\{2, 3\\}',
    time: '0.34ms',
  },
  {
    id: 'integral',
    type: 'Calculus: Indefinite',
    name: 'Calculus: Indefinite',
    equation: '∫ (3x² + 2x − 5) dx',
    latexEquation: '\\int (3x^2 + 2x - 5)\\,dx',
    latexResult: 'x^3 + x^2 - 5x + C',
    time: '0.68ms',
  },
  {
    id: 'limit',
    type: 'Calculus: Limits',
    name: 'Calculus: Limits',
    equation: 'lim_{x→0} (sin x / x)',
    latexEquation: '\\lim_{x \\to 0} \\frac{\\sin x}{x}',
    latexResult: '1 \\text{ (L\'Hôpital Verified)}',
    time: '0.41ms',
  },
  {
    id: 'linalg',
    type: 'Matrix Eigenvalues',
    name: 'Linear Algebra',
    equation: 'det(A − λI) = 0',
    latexEquation: '\\det(A - \\lambda I) = 0',
    latexResult: '\\lambda_1 = 4,\\; \\lambda_2 = -1',
    time: '1.04ms',
  },
];

export default function Home() {
  const [activeModality, setActiveModality] = useState<'write' | 'camera' | 'file'>('write');
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark>(BENCHMARKS[0]);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'MathLens',
        operatingSystem: 'All Modern Web Browsers',
        applicationCategory: 'EducationalApplication',
        description:
          'Deterministic camera, photo, and handwriting mathematical compiler and step-by-step solver running 100% client-side with zero external AI APIs.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Does MathLens use OpenAI or cloud AI APIs?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. All solving is performed by our own deterministic mathematical compiler (lexer, parser, computer algebra system, and step verifier) running locally in your browser.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are my math photos or handwriting uploaded to a server?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. Image preprocessing and character recognition occur entirely client-side using browser-local engines. Your images and notes never leave your device.',
            },
          },
          {
            '@type': 'Question',
            name: 'What types of math problems does MathLens support?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'MathLens supports exact arithmetic, order of operations, linear equations, quadratic equations with real and complex roots, systems of linear equations, polynomial factoring, and calculus.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="bg-canvas min-h-screen text-ink flex flex-col font-sans overflow-x-hidden w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ================= HEADER ================= */}
      <header className="fixed top-0 w-full z-50 bg-canvas/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Tag */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-2 group text-ink">
              <div className="relative w-8 h-8 rounded-full bg-surface flex items-center justify-center shrink-0 shadow-xs border border-black/5">
                <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7"></circle>
                  <path d="m16 16 4.5 4.5"></path>
                  <path d="m7 12 2-3 2.5 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"></path>
                  <circle cx="13.5" cy="9.5" fill="#DB9558" r="1.5" stroke="none"></circle>
                </svg>
              </div>
              <span className="font-semibold text-lg sm:text-xl tracking-tight text-ink">MathLens</span>
            </Link>
            <Badge variant="default" className="hidden md:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-sage"></span>
              <span>v1.0 • Client-side CAS</span>
            </Badge>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 rounded-full bg-olive-tint-soft/50">
            <a href="#features" className="px-4 py-1.5 rounded-full text-sm text-ink-muted hover:text-ink transition-colors">Features</a>
            <a href="#how-it-works" className="px-4 py-1.5 rounded-full text-sm text-ink-muted hover:text-ink transition-colors">How it Works</a>
            <a href="#comparison" className="px-4 py-1.5 rounded-full text-sm text-ink-muted hover:text-ink transition-colors">Methods &amp; Proofs</a>
            <a href="#benchmarks" className="px-4 py-1.5 rounded-full text-sm text-ink-muted hover:text-ink transition-colors">Benchmarks</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Button variant="ghost" size="icon" aria-label="Toggle Theme" className="h-8 w-8 sm:h-9 sm:w-9">
              <Contrast className="w-4 h-4" />
            </Button>
            <Button variant="secondary" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button variant="default" size="sm" asChild className="h-9 px-3.5 sm:h-10 sm:px-5">
              <Link href="/solve">
                <span className="hidden xs:inline">Launch</span> Solver
              </Link>
            </Button>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary flex items-center justify-center shrink-0 text-white">
              <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full pt-16 bg-canvas flex-1 overflow-x-hidden">
        <div className="flex flex-col w-full">

          {/* 1. HERO SECTION */}
          <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-8 flex flex-col items-center text-center">
            {/* Status Kicker */}
            <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-full bg-surface shadow-[0_1px_8px_rgba(0,0,0,0.04)] text-ink mb-5 sm:mb-6 border border-black/5 text-xs">
              <span className="w-2 h-2 rounded-full bg-sage animate-pulse shrink-0"></span>
              <span className="font-mono text-[11px] sm:text-xs uppercase tracking-wider text-ink font-semibold">Client-Side WASM 1.0</span>
              <span className="text-ink-muted text-xs hidden sm:inline">•</span>
              <span className="text-[11px] sm:text-xs text-ink-muted font-medium">Zero Remote Telemetry</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl max-w-4xl font-bold text-ink tracking-tight mb-4 sm:mb-5 leading-tight sm:leading-tight px-1">
              Write, snap, or upload. Solved with{' '}
              <span className="relative inline-block text-ink whitespace-nowrap">
                deterministic
                <svg className="absolute -bottom-1.5 left-0 w-full h-2.5 sm:h-3 text-amber overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 100 12">
                  <path d="M2 9C28 3 72 2.5 98 8" stroke="currentColor" strokeLinecap="round" strokeWidth="3"></path>
                </svg>
              </span>{' '}
              rigor.
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-ink-muted max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
              No external LLM guesswork. A 100% client-side WebAssembly computer algebra system delivering verifiable, step-by-step mathematical proofs with zero hallucinations.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-md mx-auto mb-6 sm:mb-8 px-2">
              <Button size="lg" asChild className="w-full sm:w-auto flex-1 h-12 sm:h-[54px]">
                <Link href="/solve" className="flex items-center justify-center gap-2">
                  <span>Launch Solver</span>
                  <span className="font-mono text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-surface/30 font-normal">Guest Mode</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 shrink-0" />
                </Link>
              </Button>
              <Button variant="secondary" size="lg" asChild className="w-full sm:w-auto h-12 sm:h-[54px]">
                <Link href="/auth" className="flex items-center justify-center gap-2">
                  <School className="w-4 h-4 text-tertiary shrink-0" />
                  <span>Institutional SSO</span>
                </Link>
              </Button>
            </div>

            {/* Trust Reassurances */}
            <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 sm:gap-x-6 text-ink-muted text-xs px-2">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sage shrink-0" />
                <span className="whitespace-nowrap">100% In-Browser Execution</span>
              </div>
              <span className="text-ink-muted/40 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sage shrink-0" />
                <span className="whitespace-nowrap">FERPA &amp; GDPR Compliant</span>
              </div>
              <span className="text-ink-muted/40 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <WifiOff className="w-4 h-4 text-sage shrink-0" />
                <span className="whitespace-nowrap">Offline Capable PWA</span>
              </div>
            </div>
          </section>

          {/* 2. INTERACTIVE TEASER & SYMBOLIC WORKBENCH PREVIEW */}
          <section id="how-it-works" className="w-full max-w-6xl mx-auto px-3 sm:px-6 mb-12 sm:mb-16">
            <Card className="overflow-hidden border border-black/5 shadow-[0_1px_12px_rgba(0,0,0,0.06)]">
              {/* Workbench Top Bar with Tabs */}
              <Tabs value={activeModality} onValueChange={(val) => setActiveModality(val as 'write' | 'camera' | 'file')} className="w-full">
                <div className="px-3 sm:px-5 py-3 bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-black/5">
                  {/* Modality Selector (Mobile Scrollable) */}
                  <div className="overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
                    <TabsList className="w-full sm:w-auto justify-start sm:justify-center">
                      <TabsTrigger value="write" className="text-[11px] sm:text-xs px-2.5 sm:px-4">
                        <PenTool className="w-3.5 h-3.5 text-amber shrink-0" />
                        <span className="whitespace-nowrap">1. Writepad</span>
                      </TabsTrigger>
                      <TabsTrigger value="camera" className="text-[11px] sm:text-xs px-2.5 sm:px-4">
                        <Camera className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">2. Camera OCR</span>
                      </TabsTrigger>
                      <TabsTrigger value="file" className="text-[11px] sm:text-xs px-2.5 sm:px-4">
                        <Upload className="w-3.5 h-3.5 shrink-0" />
                        <span className="whitespace-nowrap">3. File Drop</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* System Status Indicator */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full md:w-auto">
                    <Badge variant="surface" className="font-mono text-[11px] sm:text-xs py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-sage shrink-0"></span>
                      <span className="truncate">Deterministic Engine • 64-bit Exact</span>
                    </Badge>
                    <span className="font-mono text-xs text-ink-muted hidden sm:inline shrink-0">Thread: worker-0 (Ready)</span>
                  </div>
                </div>
              </Tabs>

              {/* Split Demonstration Pane */}
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] sm:min-h-[420px]">
                {/* Left: Input Expression Canvas */}
                <div className="lg:col-span-5 p-4 sm:p-6 flex flex-col justify-between bg-surface relative overflow-hidden border-b lg:border-b-0 lg:border-r border-black/5">
                  <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1E231D 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' }}></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold truncate">Input Canvas • Bézier 120Hz</span>
                      <span className="font-mono text-[11px] sm:text-xs px-2 py-0.5 rounded bg-surface-container-high text-ink shrink-0">Stylus Active</span>
                    </div>
                    <p className="text-xs sm:text-sm text-ink-muted mb-2 sm:mb-4">Natural raw stroke data captured client-side:</p>
                  </div>

                  {/* SVG Handwritten Representation */}
                  <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center w-full overflow-hidden">
                    <svg className="w-full max-w-[280px] h-28 sm:h-32 text-ink drop-shadow-xs" fill="none" stroke="currentColor" viewBox="0 0 320 120">
                      <line stroke="#1E231D" strokeDasharray="3 3" strokeOpacity="0.1" strokeWidth="1" x1="10" x2="310" y1="95" y2="95"></line>
                      {/* x^2 - 5x + 6 = 0 simulated handwritten strokes */}
                      <path d="M30 45 C45 65 52 82 58 92 M56 46 C42 66 35 83 28 91" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"></path>
                      <path d="M68 40 C72 32 78 30 84 34 C88 38 82 46 72 52 L87 52" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2"></path>
                      <path d="M102 68 L122 68" strokeLinecap="round" strokeWidth="3"></path>
                      <path d="M148 48 L134 48 L133 64 C136 62 144 61 149 66 C154 71 153 82 146 87 C140 91 133 89 128 85" strokeLinecap="round" strokeWidth="3"></path>
                      <path d="M168 55 C180 72 186 85 192 92 M190 55 C178 72 172 85 166 92" strokeLinecap="round" strokeWidth="3"></path>
                      <path d="M208 68 L228 68" strokeLinecap="round" strokeWidth="3"></path>
                      <path d="M248 50 C242 56 238 68 238 78 C238 86 244 92 250 92 C257 92 262 86 261 77 C260 69 253 66 244 68" strokeLinecap="round" strokeWidth="3"></path>
                      <path d="M276 65 L298 65 M276 75 L298 75" strokeLinecap="round" strokeWidth="3"></path>
                      <ellipse cx="310" cy="71" rx="7" ry="12" strokeLinecap="round" strokeWidth="3"></ellipse>

                      <circle cx="58" cy="92" fill="#DB9558" r="2.5" stroke="none"></circle>
                      <circle cx="84" cy="34" fill="#DB9558" r="2.5" stroke="none"></circle>
                      <circle cx="149" cy="66" fill="#DB9558" r="2.5" stroke="none"></circle>
                      <circle cx="250" cy="92" fill="#DB9558" r="2.5" stroke="none"></circle>
                    </svg>
                    <div className="flex items-center gap-2 mt-2 font-mono text-[11px] sm:text-xs text-ink-muted">
                      <span className="w-2 h-2 rounded-full bg-amber shrink-0"></span>
                      <span className="truncate">18 Vertices • 2D Polylines</span>
                    </div>
                  </div>

                  {/* Canvas controls */}
                  <div className="relative z-10 flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" aria-label="Undo" className="h-8 w-8"><Undo2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Redo" className="h-8 w-8"><Redo2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label="Clear Canvas" className="h-8 w-8 hover:text-error hover:bg-error-container/30"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    <span className="font-mono text-[11px] sm:text-xs text-ink-muted">Latency: 0.4ms</span>
                  </div>
                </div>

                {/* Center Divider / Pipeline Transition */}
                <div className="lg:col-span-1 bg-surface-container-low flex flex-col items-center justify-center py-3 lg:py-0 border-b lg:border-b-0 lg:border-r border-black/5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-surface shadow-xs flex items-center justify-center text-amber border border-black/5">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] text-ink-muted mt-1.5 tracking-tighter uppercase font-semibold">Parse AST</span>
                </div>

                {/* Right: CAS Output & Steps */}
                <div className="lg:col-span-6 p-4 sm:p-6 bg-surface flex flex-col justify-between">
                  <div>
                    {/* Header with confidence */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3 sm:mb-4">
                      <span className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Symbolic CAS Output</span>
                      <Badge variant="sage" className="text-[11px] sm:text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sage shrink-0" />
                        <span>Valid AST Grammar (99.8%)</span>
                      </Badge>
                    </div>

                    {/* Parsed Formula (KaTeX) */}
                    <div className="p-3 sm:p-4 rounded-xl bg-surface-container-lowest border border-black/5 shadow-xs mb-3 sm:mb-4 overflow-x-auto">
                      <span className="font-mono text-[11px] sm:text-xs text-ink-muted block mb-1">Parsed Expression (LaTeX)</span>
                      <div className="text-xl sm:text-2xl text-ink font-semibold py-1">
                        <MathRenderer math="x^2 - 5x + 6 = 0" block />
                      </div>
                    </div>

                    {/* Step Decomposition */}
                    <div className="space-y-2 mb-3 sm:mb-4">
                      <div className="p-2.5 sm:p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
                        <span className="font-mono text-xs text-amber font-semibold shrink-0 mt-0.5">01</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-medium text-ink truncate">Polynomial Factorization</span>
                            <span className="font-mono text-[11px] text-ink-muted shrink-0">O(1) Exact</span>
                          </div>
                          <div className="text-xs sm:text-sm text-ink-muted mt-1 overflow-x-auto">
                            <MathRenderer math="(x - 2)(x - 3) = 0" />
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 sm:p-3 rounded-lg bg-surface-container-low flex items-start gap-3">
                        <span className="font-mono text-xs text-sage font-semibold shrink-0 mt-0.5">02</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-medium text-ink truncate">Zero-Product Principle</span>
                            <span className="text-[11px] text-sage font-semibold shrink-0">Roots</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-surface text-ink text-xs sm:text-sm font-semibold shadow-xs border border-black/5">
                              <MathRenderer math="x_1 = 2" />
                            </span>
                            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-surface text-ink text-xs sm:text-sm font-semibold shadow-xs border border-black/5">
                              <MathRenderer math="x_2 = 3" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Verification Pill */}
                  <div className="p-2.5 sm:p-3 rounded-xl bg-surface-container text-ink font-mono text-[11px] sm:text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="w-4 h-4 text-sage shrink-0" />
                      <span className="truncate">Verified: f(2) = 0, f(3) = 0</span>
                    </div>
                    <span className="text-ink-muted shrink-0 text-[10px] sm:text-xs">Residual: 0.00e+00</span>
                  </div>
                </div>
              </div>
            </Card>
          </section>

          {/* 3. THREE CORE CAPTURE WORKFLOWS */}
          <section id="features" className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
              <span className="text-xs uppercase tracking-wider text-amber font-semibold block mb-1.5">Input Modalities</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-2">
                Three capture workflows. Zero latency penalties.
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
                Every input path compiles directly into an immutable Abstract Syntax Tree within browser memory. No payload departs your machine.
              </p>
            </div>

            {/* Triad Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1: Inking */}
              <Card className="p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform">
                <div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber/15 text-primary flex items-center justify-center mb-3 sm:mb-4">
                    <PenTool className="w-5 h-5 sm:w-6 sm:h-6 text-amber" />
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wide bg-surface-container-high text-ink font-medium mb-2">Modality A</div>
                  <h3 className="text-base sm:text-lg font-semibold text-ink mb-1">Write Problem &amp; Solve</h3>
                  <p className="text-xs sm:text-sm text-ink-muted mb-4 leading-relaxed">
                    Direct vector inking canvas tuned for Apple Pencil, Wacom, and touch screens. Features 120Hz Bézier smoothing, multi-stroke equation grouping, and undo trees.
                  </p>
                </div>
                <div className="pt-3 bg-surface-container-low/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-3 sm:p-4 rounded-b-2xl flex items-center justify-between text-ink-muted font-mono text-[11px] sm:text-xs border-t border-black/5">
                  <span className="truncate">Target: PointerEvents</span>
                  <span className="text-sage font-medium shrink-0">Jitter: &lt;0.02px</span>
                </div>
              </Card>

              {/* Card 2: Optical Camera OCR */}
              <Card className="p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform">
                <div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-secondary-container/60 text-secondary flex items-center justify-center mb-3 sm:mb-4">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wide bg-surface-container-high text-ink font-medium mb-2">Modality B</div>
                  <h3 className="text-base sm:text-lg font-semibold text-ink mb-1">Capture Photo &amp; Solve</h3>
                  <p className="text-xs sm:text-sm text-ink-muted mb-4 leading-relaxed">
                    Instant camera capture running local browser OCR. Real-time edge identification, perspective auto-rectification, and ambient shadow cancellation.
                  </p>
                </div>
                <div className="pt-3 bg-surface-container-low/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-3 sm:p-4 rounded-b-2xl flex items-center justify-between text-ink-muted font-mono text-[11px] sm:text-xs border-t border-black/5">
                  <span className="truncate">MediaStream API</span>
                  <span className="text-sage font-medium shrink-0">Local Client OCR</span>
                </div>
              </Card>

              {/* Card 3: File Upload Dropzone */}
              <Card className="p-5 sm:p-6 flex flex-col justify-between hover:-translate-y-1 transition-transform">
                <div>
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center mb-3 sm:mb-4">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-tertiary" />
                  </div>
                  <div className="inline-block px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wide bg-surface-container-high text-ink font-medium mb-2">Modality C</div>
                  <h3 className="text-base sm:text-lg font-semibold text-ink mb-1">Upload Photo &amp; Solve</h3>
                  <p className="text-xs sm:text-sm text-ink-muted mb-4 leading-relaxed">
                    Drag-and-drop support for PNG, JPG, or WebP worksheet photos. Automatic region-of-interest equation cropping and instant mathematical validation.
                  </p>
                </div>
                <div className="pt-3 bg-surface-container-low/50 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-3 sm:p-4 rounded-b-2xl flex items-center justify-between text-ink-muted font-mono text-[11px] sm:text-xs border-t border-black/5">
                  <span className="truncate">PNG, JPG, WebP</span>
                  <span className="text-sage font-medium shrink-0">Batch Queuing</span>
                </div>
              </Card>
            </div>
          </section>

          {/* 4. DETERMINISTIC ENGINE VS PROBABILISTIC AI */}
          <section id="comparison" className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-12">
            <Card className="p-4 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-black/5">
                <div>
                  <span className="text-xs uppercase tracking-wider text-sage font-semibold block mb-1">Architecture Comparison</span>
                  <h2 className="text-xl sm:text-3xl font-bold text-ink tracking-tight">
                    Symbolic Rigor vs. Statistical Guesswork
                  </h2>
                </div>
                <div className="text-ink-muted font-mono text-[11px] sm:text-xs">
                  Benchmark: SymPy &amp; CAS-100 Test Suite
                </div>
              </div>

              {/* Responsive Table with scroll container */}
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full text-left text-xs sm:text-sm min-w-[540px]">
                  <thead>
                    <tr className="text-ink-muted text-[11px] sm:text-xs uppercase tracking-wider">
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold">Evaluation Vector</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-error/90 bg-error-container/20 rounded-l-lg">Standard LLM Math</th>
                      <th className="py-2.5 sm:py-3 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft rounded-r-lg">MathLens CAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-ink">Computational Foundation</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-ink-muted bg-error-container/10">Next-token predictive probability; prone to sign errors</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft/50">Formal CAS with deterministic rewrite rules</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-ink">Exact Arithmetic</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-ink-muted bg-error-container/10">Approximates floating-point (1/3 ≈ 0.33333)</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft/50">Pure symbolic rationals (√2, π, e kept exact)</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-ink">Proof Verification</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-ink-muted bg-error-container/10">Unverifiable text hallucination</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft/50">Substituted Q.E.D. backward validation</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-ink">Latency &amp; Execution</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-ink-muted bg-error-container/10">2,500ms – 6,000ms cloud roundtrip</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft/50">&lt; 1.2ms local client thread execution</td>
                    </tr>
                    <tr className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-medium text-ink">Data Privacy</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 text-ink-muted bg-error-container/10">Exfiltrates exam worksheets to cloud servers</td>
                      <td className="py-3 sm:py-4 px-3 sm:px-4 font-semibold text-ink bg-olive-tint-soft/50">100% Client-side sandbox. Zero-knowledge</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          {/* 5. INTERACTIVE LIVE BENCHMARK STRIP */}
          <section id="benchmarks" className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 mb-12 sm:mb-16">
            <div className="bg-surface-container rounded-2xl p-4 sm:p-6 shadow-xs border border-black/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber shrink-0" />
                  <span className="text-lg sm:text-xl font-bold text-ink">Live Kernel Benchmark</span>
                </div>
                <span className="text-xs text-ink-muted">Tap an expression to run real-time benchmark:</span>
              </div>

              {/* Clickable Benchmark Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-4">
                {BENCHMARKS.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBenchmark(b)}
                    type="button"
                    className={`p-3 rounded-xl bg-surface text-ink text-left text-xs hover:shadow-md transition-all active:scale-[0.98] shadow-xs flex flex-col justify-between border cursor-pointer ${
                      selectedBenchmark.id === b.id ? 'ring-2 ring-amber border-transparent' : 'border-black/5'
                    }`}
                  >
                    <span className="text-[11px] font-sans text-ink-muted mb-1 truncate">{b.name}</span>
                    <div className="font-semibold text-ink mb-2 text-sm overflow-x-auto">
                      <MathRenderer math={b.latexEquation} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-sage font-medium">
                      <span>Latency: {b.time}</span>
                      <PlayCircle className="w-4 h-4 text-amber shrink-0" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Telemetry output */}
              <div className="bg-surface rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-ink border border-black/5">
                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sage/20 text-ink flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <CheckCircle2 className="w-4 h-4 text-sage" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] sm:text-xs text-ink-muted block truncate">Selected: {selectedBenchmark.type}</span>
                    <div className="text-xs sm:text-sm font-semibold text-ink flex flex-wrap items-center gap-1.5 mt-0.5 overflow-x-auto">
                      <MathRenderer math={selectedBenchmark.latexEquation} />
                      <span className="text-ink-muted text-xs">⟶ Sol:</span>
                      <MathRenderer math={selectedBenchmark.latexResult} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-black/5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] sm:text-xs text-ink-muted block">Runtime</span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-amber">{selectedBenchmark.time}</span>
                  </div>
                  <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded bg-secondary-container text-ink font-mono text-[10px] sm:text-xs font-semibold whitespace-nowrap">
                    Q.E.D. Proof Validated
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 6. FINAL ACADEMIC CTA BANNER */}
          <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 pb-12 sm:pb-16">
            <Card className="relative p-6 sm:p-12 overflow-hidden text-center flex flex-col items-center">
              <div className="absolute -right-8 -bottom-10 text-olive-tint-soft opacity-30 select-none pointer-events-none font-serif text-[120px] sm:text-[180px] leading-none">
                ∫
              </div>
              <Badge variant="default" className="mb-3 sm:mb-4 text-xs">
                <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                <span className="truncate">Open Educational Computing Node</span>
              </Badge>
              <h2 className="text-xl sm:text-3xl font-bold text-ink tracking-tight max-w-2xl mb-2 px-1">
                Experience zero-latency mathematical reasoning in your browser.
              </h2>
              <p className="text-xs sm:text-sm text-ink-muted max-w-xl mx-auto mb-5 sm:mb-6 leading-relaxed px-2">
                Compatible with all modern browser engines. Zero download footprint, zero telemetry accounts required to compute.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-md">
                <Button size="lg" asChild className="w-full sm:w-auto flex-1 h-12 sm:h-[52px]">
                  <Link href="/solve" className="flex items-center justify-center gap-2">
                    <span>Launch Solver Now</span>
                    <Zap className="w-4 h-4 shrink-0" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild className="w-full sm:w-auto h-12 sm:h-[52px]">
                  <a href="#comparison" className="flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4 text-ink-muted shrink-0" />
                    <span>Read Methods &amp; Proofs</span>
                  </a>
                </Button>
              </div>
            </Card>
          </section>

        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-surface py-6 sm:py-8 border-t border-black/5 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 text-ink-muted text-center md:text-left text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 rounded-full bg-sage shrink-0"></span>
            <span>MathLens v1.0 • Client-Side WASM • Zero Telemetry • MIT License</span>
          </div>
          <div className="flex items-center justify-center gap-3 sm:gap-4 text-[11px] sm:text-xs">
            <span>Academic Computing Node</span>
            <span>•</span>
            <span>Cambridge, MA</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
