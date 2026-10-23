'use client';

import React, { useState, useRef } from "react";
import { solveMathProblem } from "@/lib/engine/solver";
import { SolutionResult } from "@/lib/engine/types";
import { ExpressionEditor } from "@/components/solve/expression-editor";
import { CompleteSolutionNarrative } from "@/components/solve/complete-solution-narrative";
import { MathRenderer } from "@/components/ui/MathRenderer";
import { saveHistory, setHistoryFavorite } from "@/lib/history";

const ALLOWED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

async function prepareUploadImage(dataUrl: string, rotation: number, invert: boolean): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Could not read image."));
  });

  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const radians = (rotation * Math.PI) / 180;
  const rotatedWidth = Math.round(Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians)));
  const rotatedHeight = Math.round(Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians)));
  const canvas = document.createElement("canvas");
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare the image.");

  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -width / 2, -height / 2, width, height);

  if (invert) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < imageData.data.length; index += 4) {
      imageData.data[index] = 255 - imageData.data[index];
      imageData.data[index + 1] = 255 - imageData.data[index + 1];
      imageData.data[index + 2] = 255 - imageData.data[index + 2];
    }
    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

export default function UploadSolvePage() {
  const [uploadRotation, setUploadRotation] = useState(0);
  const [isUploadInverted, setIsUploadInverted] = useState(false);
  const [isAnalyzingUpload, setIsAnalyzingUpload] = useState(false);
  const [uploadFeedbackText, setUploadFeedbackText] = useState<string | null>(null);
  const [isUploadStarred, setIsUploadStarred] = useState(false);
  const [copiedUploadType, setCopiedUploadType] = useState<"latex" | "plain" | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState("No image selected");
  const [fileSize, setFileSize] = useState("—");
  const [imageDimensions, setImageDimensions] = useState("—");
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEditingExpression, setIsEditingExpression] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expression, setExpression] = useState<string>("x^2 - 5x + 6 = 0");
  const [recognizedText, setRecognizedText] = useState<string>("x^2 - 5x + 6 = 0");
  const [latexExpr, setLatexExpr] = useState<string>("x^2 - 5x + 6 = 0");
  const [activeEngine, setActiveEngine] = useState<string>("Gemini 2.5 Flash Vision");
  const [confidence, setConfidence] = useState<number>(99.8);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [solution, setSolution] = useState<SolutionResult>(() => {
    const s = solveMathProblem("x^2 - 5x + 6 = 0");
    return { ...s, executionTimeMs: 0.5 };
  });

  const handleSelectedFile = (file: File) => {
    setAnalysisError(null);
    setHistoryNotice(null);

    if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
      setAnalysisError("Unsupported file type. Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setAnalysisError("That image is larger than 10 MB. Choose a smaller file.");
      return;
    }

    setFileName(file.name);
    setFileSize((file.size / (1024 * 1024)).toFixed(2) + " MB");
    setUploadRotation(0);
    setIsUploadInverted(false);
    setIsConfirming(false);
    setIsEditingExpression(false);
    setHistoryId(null);
    setIsUploadStarred(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result !== "string") return;
      setCustomImage(result);
      const image = new Image();
      image.onload = () => setImageDimensions(`${image.naturalWidth}×${image.naturalHeight} px`);
      image.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectedFile(file);
    e.target.value = "";
  };

  const handleCopyUploadLatex = async () => {
    try {
      await navigator.clipboard.writeText(latexExpr);
      setCopiedUploadType("latex");
      setTimeout(() => setCopiedUploadType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyUploadPlain = async () => {
    try {
      await navigator.clipboard.writeText(expression);
      setCopiedUploadType("plain");
      setTimeout(() => setCopiedUploadType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleAnalyzeUpload = async () => {
    setIsAnalyzingUpload(true);
    setUploadFeedbackText("Running OCR (Tesseract + Gemini)...");
    setAnalysisError(null);
    setHistoryNotice(null);

    try {
      if (!customImage) {
        setAnalysisError("Choose a JPG, PNG, or WebP image before running OCR.");
        setIsAnalyzingUpload(false);
        setUploadFeedbackText(null);
        return;
      }

      let payloadImage: string;
      try {
        payloadImage = await prepareUploadImage(customImage, uploadRotation, isUploadInverted);
      } catch {
        setAnalysisError("The selected image could not be prepared. Try another file.");
        setIsAnalyzingUpload(false);
        setUploadFeedbackText(null);
        return;
      }

      let tesseractCandidate = "";
      try {
        setUploadFeedbackText("Phase 1: Local optical scan (Tesseract)...");
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist: "0123456789+-*/=^()xyzXYZabAB ",
          tessedit_pageseg_mode: "6" as unknown as import("tesseract.js").PSM,
        });
        const tRes = await worker.recognize(payloadImage);
        if (tRes.data?.text) {
          tesseractCandidate = tRes.data.text.trim();
        }
        await worker.terminate();
      } catch (tErr) {
        console.warn("Tesseract upload scan skipped:", tErr);
      }

      setUploadFeedbackText("Phase 2: Reconciling with Gemini Vision...");
      let geminiError = false;
      try {
        const res = await fetch("/api/ocr/gemini", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: payloadImage,
            mimeType: "image/jpeg",
            ocrHint: tesseractCandidate || undefined,
          }),
        });

        if (!res.ok) {
          geminiError = true;
        } else {
          const data = await res.json();
          if (data.expression && data.expression.trim()) {
            const recognized = data.expression.trim();
            setExpression(recognized);
            setRecognizedText(recognized);
            setLatexExpr(data.latex || recognized);
            setConfidence(data.confidence || 98.5);
            setActiveEngine(tesseractCandidate ? "Ensemble: Tesseract + Gemini" : "Gemini 2.5 Flash Vision");
            setIsConfirming(true);
            setIsEditingExpression(true);
            setHistoryId(null);
            setIsUploadStarred(false);
            setUploadFeedbackText("Recognized. Review and confirm the expression to solve.");
            return;
          }
          geminiError = true;
        }
      } catch {
        geminiError = true;
      }

      if (tesseractCandidate) {
        setExpression(tesseractCandidate);
        setRecognizedText(tesseractCandidate);
        setLatexExpr(tesseractCandidate);
        setConfidence(75);
        setActiveEngine("Local Tesseract fallback");
        setIsConfirming(true);
        setIsEditingExpression(true);
        setHistoryId(null);
        setIsUploadStarred(false);
        setAnalysisError(
          geminiError
            ? "Gemini OCR was unavailable. The local Tesseract result is shown for confirmation."
            : "Gemini did not return a usable expression. The local Tesseract result is shown."
        );
        setUploadFeedbackText("Review the fallback result before solving.");
        return;
      }

      setAnalysisError("No mathematical expression was recognized. Try a clearer image or edit manually.");
      setUploadFeedbackText("Recognition failed. You can enter the expression manually.");
      setIsEditingExpression(true);
      setIsConfirming(true);
    } catch (err: unknown) {
      console.warn("Upload OCR error:", err);
      const msg = err instanceof Error ? err.message : "Recognition error";
      setAnalysisError(msg);
      setUploadFeedbackText("Recognition failed. Edit the expression manually or try another image.");
      setIsEditingExpression(true);
      setIsConfirming(true);
    } finally {
      setTimeout(() => {
        setIsAnalyzingUpload(false);
        setUploadFeedbackText(null);
      }, 1400);
    }
  };

  const handleConfirmExpression = async (result: SolutionResult) => {
    setSolution(result);
    setLatexExpr(result.latexExpression);
    setIsConfirming(false);
    setIsEditingExpression(false);
    setUploadFeedbackText(`Solved: ${result.finalAnswerPlain}`);
    setAnalysisError(null);
    setHistoryNotice(null);

    try {
      const record = await saveHistory({
        inputType: "upload",
        expression: result.normalizedExpression,
        recognizedText,
        latex: result.latexExpression,
        problemType: result.problemType,
        finalAnswerPlain: result.finalAnswerPlain,
        finalAnswerLatex: result.finalAnswerLatex,
        steps: result.steps,
        isVerified: result.isVerified,
      });
      setHistoryId(record.id);
      setIsUploadStarred(record.favorite);
      setHistoryNotice("Saved to Notebook.");
    } catch {
      setHistoryNotice("Solved, but local history is unavailable in this browser.");
    }
  };

  const handleToggleFavorite = async () => {
    if (!historyId) {
      if (!solution.success) return;
      try {
        const record = await saveHistory({
          inputType: "upload",
          expression: solution.normalizedExpression,
          recognizedText,
          latex: solution.latexExpression,
          problemType: solution.problemType,
          finalAnswerPlain: solution.finalAnswerPlain,
          finalAnswerLatex: solution.finalAnswerLatex,
          steps: solution.steps,
          isVerified: solution.isVerified,
          favorite: true,
        });
        setHistoryId(record.id);
        setIsUploadStarred(true);
        setHistoryNotice("Saved to Notebook.");
      } catch {
        setHistoryNotice("Could not update local history.");
      }
      return;
    }
    const next = !isUploadStarred;
    setIsUploadStarred(next);
    try {
      await setHistoryFavorite(historyId, next);
    } catch {
      setHistoryNotice("Could not update local history.");
    }
  };

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
                      TypeScript CAS
                    </span>
                  </div>
                  <div className="flex flex-col px-space-xs border-r border-hairline pr-space-md">
                    <span className="font-caption text-caption text-ink-muted uppercase">Latency</span>
                    <span className="font-code-sm text-code-sm font-bold text-ink">0.45 s</span>
                  </div>
                  <div className="flex flex-col px-space-xs">
                    <span className="font-caption text-caption text-ink-muted uppercase">AI Scope</span>
                    <span className="font-code-sm text-code-sm font-bold text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">shield</span> OCR only
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
                      {/* Real photo placeholder or user-uploaded file */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        className={`w-full h-80 object-cover rounded shadow-inner transition-all duration-300 ${
                          isUploadInverted ? 'invert hue-rotate-180' : ''
                        }`}
                        style={{ transform: `rotate(${uploadRotation}deg)` }}
                        alt="Handwritten math worksheet"
                        src={customImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuDRyP8JziTWzfAn9NRXPrubGscijbTCcbNlcIwlk2YeX7w7x4qOwK88VxAiXWmmAGogb8a1M38Yor_O4eaNpegGtU8NcCpLZdrjxeNDQBjrvz17QHnsLjIZqpbrjTfnJ1UzbG-G8DiJWNoM0SbtcblsnO1mlt_CKLFX5zcDi-UAju4moEGlSTzYfOFKbTmzGMJ6UQyOvcwMB4Yf5ZPjpBcnVYuD1iClrZjSVvKNsH9tQOCLZCqHxCCBcg"}
                      />
                      {/* Visual Scrim & Grid Guideline Overlay */}
                      <div className="absolute inset-0 bg-ink/5 pointer-events-none"></div>

                      {/* OCR Bounding Box Indicator */}
                      <div className="absolute inset-x-8 top-16 bottom-16 rounded-lg bg-amber/10 pointer-events-none flex flex-col justify-between p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber text-ink font-code-sm text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow-sm">
                            <span className="material-symbols-outlined text-[13px]">crop_free</span>
                            ROI #01 • {solution.problemType}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface/90 text-ink font-code-sm text-[10px] backdrop-blur-sm shadow-xs">
                            {confidence}% Match
                          </span>
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="font-code-sm text-[10px] text-ink bg-surface/90 px-1.5 py-0.5 rounded backdrop-blur-sm shadow-xs">
                            Orientation: {uploadRotation}.00° • {isUploadInverted ? 'Inverted' : 'Clean'}
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
                        <span className="font-medium truncate">{fileName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-muted">
                        <span>{fileSize}</span>
                        <span>•</span>
                        <span>{imageDimensions}</span>
                      </div>
                    </div>

                    {/* Quick Image Manipulation Toolbar */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => setUploadRotation((prev) => (prev + 90) % 360)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-ink font-body-sm text-body-sm font-medium cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[17px]">rotate_right</span>
                        <span>Rotate 90°</span>
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
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragActive(true);
                      }}
                      onDragLeave={() => setIsDragActive(false)}
                      onDrop={(event) => {
                        event.preventDefault();
                        setIsDragActive(false);
                        const file = event.dataTransfer.files?.[0];
                        if (file) handleSelectedFile(file);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          fileInputRef.current?.click();
                        }
                      }}
                      className={`rounded-lg p-space-md flex flex-col items-center justify-center text-center gap-2 transition-colors cursor-pointer group border border-dashed ${
                        isDragActive
                          ? "bg-amber/10 border-amber"
                          : "bg-canvas/70 hover:bg-canvas border-hairline"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shadow-sm text-primary group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-sm text-body-sm font-medium text-ink">
                          Drag an image here, or <span className="text-primary underline cursor-pointer">browse filesystem</span>
                        </span>
                        <span className="font-code-sm text-code-sm text-ink-muted">
                          JPG, PNG, or WebP • maximum 10 MB
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Action Dock */}
                  <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-2">
                    <button
                      onClick={handleAnalyzeUpload}
                      disabled={isAnalyzingUpload}
                      className="w-full sm:flex-1 h-[54px] rounded-full bg-amber hover:brightness-105 active:scale-[0.99] transition-all text-ink font-semibold font-body-lg text-body-lg flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:cursor-wait disabled:opacity-70"
                      type="button"
                    >
                      {isAnalyzingUpload ? (
                        <>
                          <span className="material-symbols-outlined text-[22px] animate-spin">refresh</span>
                          <span>{uploadFeedbackText || 'Reading image...'}</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[22px]">document_scanner</span>
                          <span>Read Image &amp; Confirm</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto h-[54px] px-space-md rounded-full bg-surface hover:bg-surface-container transition-colors text-ink font-body-sm text-body-sm font-medium flex items-center justify-center gap-2 shadow-sm cursor-pointer border border-hairline"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">folder_open</span>
                      <span className="whitespace-nowrap">Choose Another Image</span>
                    </button>
                  </div>

                  {/* OCR disclosure */}
                  <div className="p-space-md rounded-xl bg-surface-container-low flex items-start gap-space-sm border border-hairline">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">verified_user</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-headline-sm text-[14px] leading-tight font-semibold text-ink">AI-Assisted OCR, Local Solving</span>
                      <p className="font-body-sm text-[13px] leading-relaxed text-ink-muted">
                        The selected image is sent through this app&apos;s server to Gemini for recognition
                        and is not stored by MathLens. Tesseract runs in your browser as a fallback.
                        Parsing, solving, and verification stay deterministic and local.
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
                        {activeEngine} • Ingestion Ready
                      </span>
                    </div>
                    <span className="font-code-sm text-code-sm text-ink-muted">Confidence: {confidence}%</span>
                  </div>

                  {analysisError && (
                    <div role="alert" className="rounded-lg border border-error/30 bg-error-container/50 px-3 py-2 font-body-sm text-sm text-error">
                      {analysisError}
                    </div>
                  )}

                  {/* Extracted Formula & LaTeX Viewport */}
                  <div className="bg-surface rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm border border-hairline">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-caption text-caption uppercase text-ink-muted tracking-wider">Recognized Math Expression</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-body-sm text-[12px] font-medium ${
                          isConfirming ? 'bg-amber/20 text-ink' : 'bg-sage text-ink'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">
                            {isConfirming ? 'edit_note' : 'check'}
                          </span>
                          {isConfirming ? 'Needs confirmation' : solution.problemType}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingExpression((value) => !value);
                            if (!isEditingExpression) setIsConfirming(true);
                          }}
                          className="flex items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-0.5 font-code-sm text-[10px] text-ink-muted transition-colors hover:bg-surface-container hover:text-ink"
                        >
                          <span className="material-symbols-outlined text-[13px]">edit</span>
                          {isEditingExpression ? 'Close' : 'Edit'}
                        </button>
                      </div>
                    </div>

                    {isEditingExpression ? (
                      <ExpressionEditor
                        value={expression}
                        onChange={(next) => {
                          setExpression(next);
                          setIsConfirming(true);
                          setHistoryId(null);
                          setIsUploadStarred(false);
                        }}
                        onConfirm={handleConfirmExpression}
                        confirmLabel="Confirm & Solve"
                        inputId="upload-expression"
                      />
                    ) : (
                      <>
                        <div className="py-space-md px-space-lg rounded-lg bg-canvas/60 flex items-center justify-center text-center border border-hairline overflow-x-auto">
                          <MathRenderer math={latexExpr || expression} block className="text-2xl text-ink md:text-3xl" />
                        </div>
                        <div className="flex items-center justify-between gap-space-sm p-2 rounded-lg bg-surface-container-low font-code-input text-code-input text-ink border border-hairline">
                          <div className="flex items-center gap-2 truncate pl-1">
                            <span className="text-outline text-xs select-none">Equation:</span>
                            <code className="font-code-input text-[13px] select-all truncate text-ink">{expression}</code>
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
                      </>
                    )}
                  </div>

                  {analysisError && (
                    <div className="rounded-xl border border-error/30 bg-error-container/30 p-space-md flex items-start gap-2 text-ink">
                      <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">error</span>
                      <p className="font-body-sm text-[13px]">{analysisError}</p>
                    </div>
                  )}

                  {isConfirming && (
                    <div className="rounded-xl border border-amber/40 bg-amber/10 p-space-md">
                      <p className="font-body-sm text-sm font-semibold text-ink">Confirm before solving</p>
                      <p className="mt-1 font-body-sm text-[13px] text-ink-muted">
                        OCR output is untrusted. Check the expression above and press Confirm &amp; Solve.
                      </p>
                    </div>
                  )}

                  <div className={isConfirming ? 'hidden' : 'contents'}>

                  {/* Canonical Result Hero Box */}
                  <div className="bg-surface rounded-xl p-space-lg shadow-sm flex flex-col gap-space-md relative overflow-hidden border border-hairline">
                    <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber text-[20px]">workspace_premium</span>
                        <span className="font-code-sm text-code-sm uppercase font-semibold text-ink tracking-wider">Canonical Solution</span>
                      </div>
                      <span className="font-code-sm text-code-sm text-ink-muted">{solution.problemType}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="font-caption text-caption uppercase text-ink-muted">Exact Roots / Evaluation</span>
                        <div className="font-serif text-3xl lg:text-4xl font-medium text-ink pt-1 tracking-tight select-all">
                          {solution.finalAnswerLatex || solution.finalAnswerPlain}
                        </div>
                      </div>
                      {solution.executionTimeMs !== undefined && (
                        <div className="flex flex-col sm:items-end">
                          <span className="font-caption text-caption uppercase text-ink-muted">CAS Latency</span>
                          <span className="font-code-input text-code-input font-medium text-amber pt-1">
                            {solution.executionTimeMs} ms
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-space-sm rounded-lg bg-secondary-fixed/40 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2 text-ink">
                        <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                        <span className="font-body-sm text-[13px] font-medium">
                          {solution.isVerified ? '✓ Verified by direct check' : 'Derivation completed'}
                        </span>
                      </div>
                      <span className="font-code-sm text-code-sm font-semibold text-secondary">
                        {solution.verificationDetails?.status || 'Verification Status'}
                      </span>
                    </div>
                  </div>



                  {/* Complete Written Solution in Text Form (One Go) */}
                  <CompleteSolutionNarrative
                    solution={solution}
                    originalProblem={expression}
                    idPrefix="upload-narrative"
                  />

                  {/* Client-Side Verification Audit Log */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-2 font-code-input text-[12px] border border-hairline">
                    <div className="flex items-center justify-between text-ink-muted pb-1 border-b border-hairline font-code-sm">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${solution.isVerified ? 'bg-secondary' : 'bg-amber'}`}></span>
                        Deterministic Verification Audit (Client-Side)
                      </span>
                      <span>{solution.verificationDetails.status}</span>
                    </div>
                    <p className="text-ink font-code-sm break-all">
                      {`// f(x) := ${solution.normalizedExpression}`}
                    </p>
                    <p className={solution.isVerified ? 'text-secondary font-code-sm' : 'text-error font-code-sm'}>
                      {`// LHS = ${solution.verificationDetails.lhsValue} | RHS = ${solution.verificationDetails.rhsValue}`}
                    </p>
                    <p className="text-ink-muted font-code-sm">
                      {`// Residual norm = ${solution.verificationDetails.residualNorm.toExponential(2)} | verified = ${solution.isVerified}`}
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
                        onClick={handleToggleFavorite}
                        className={`px-3.5 py-2 rounded-full bg-surface hover:bg-surface-container transition-colors font-body-sm text-body-sm font-medium flex items-center gap-1.5 shadow-sm cursor-pointer border border-hairline ${
                          isUploadStarred ? 'text-amber' : 'text-ink'
                        }`}
                        type="button"
                        aria-pressed={isUploadStarred}
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
                      <span>Re-run OCR</span>
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                    </button>
                  </div>
                  {historyNotice && (
                    <p role="status" className="px-space-xs font-code-sm text-[11px] text-ink-muted">
                      {historyNotice}
                    </p>
                  )}
                  </div>
                </section>
              </div>


            </div>
          </div>
  );
}
