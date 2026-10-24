'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { solveMathProblem } from '@/lib/engine/solver';
import { SolutionResult } from '@/lib/engine/types';
import { saveHistory, setHistoryFavorite } from '@/lib/history';
import { CompleteSolutionNarrative } from '@/components/solve/complete-solution-narrative';

async function getVideoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((device) => device.kind === 'videoinput');
}

export default function CaptureSolvePage() {
  // Camera & Stream State
  const [cameraDevice, setCameraDevice] = useState<string>('default');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);
  const [compositionGrid, setCompositionGrid] = useState<boolean>(true);
  const [flashActive, setFlashActive] = useState<boolean>(false);

  // Capture, OCR & Processing State
  const [isProcessingCapture, setIsProcessingCapture] = useState<boolean>(false);
  const [captureFeedbackText, setCaptureFeedbackText] = useState<string | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [ocrEngine] = useState<'hybrid' | 'gemini' | 'wasm'>('hybrid');
  const [activeEngineUsed, setActiveEngineUsed] = useState<string>('Gemini 2.5 Flash');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Equation & Confirm Step State (FR-CE)
  const [currentExpression, setCurrentExpression] = useState<string>('x^2 - 5x + 6 = 0');
  const [solution, setSolution] = useState<SolutionResult>(() => {
    const s = solveMathProblem('x^2 - 5x + 6 = 0');
    // Ensure deterministic executionTime for initial SSR render
    return { ...s, executionTimeMs: 0.5 };
  });
  const [isEditingConfirm, setIsEditingConfirm] = useState<boolean>(false);
  const [editBuffer, setEditBuffer] = useState<string>('x^2 - 5x + 6 = 0');

  // Bookmarking & Feedback
  const [isCaptureStarred, setIsCaptureStarred] = useState<boolean>(false);
  const [copiedCaptureType, setCopiedCaptureType] = useState<'latex' | 'steps' | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [historyNotice, setHistoryNotice] = useState<string | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const noticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showCameraNotice = (message: string) => {
    setCameraNotice(message);
    if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
    noticeTimeoutRef.current = setTimeout(() => setCameraNotice(null), 3000);
  };

  // 1. Initialize Camera and enumerate physical devices
  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setCameraError('Camera API (getUserMedia) not supported in this browser.');
          return;
        }

        setAvailableDevices(await getVideoInputs());

        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setIsCameraActive(true);
        setCameraError(null);

        // Device labels and availability are only exposed after permission is granted.
        setAvailableDevices(await getVideoInputs());
      } catch (err: unknown) {
        console.warn('Camera access error or permission denied:', err);
        if (!cancelled) {
          setCameraError('Camera access denied or unavailable. Using high-resolution optical calibration feed.');
          setIsCameraActive(false);
        }
      }
    }

    initCamera();

    return () => {
      cancelled = true;
      if (noticeTimeoutRef.current) clearTimeout(noticeTimeoutRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Attach the stream once the video element mounts after camera activation.
  useEffect(() => {
    if (isCameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [isCameraActive]);

  // Keep the device list in sync when cameras are plugged in or removed.
  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return;

    const handleDeviceChange = () => {
      getVideoInputs()
        .then(setAvailableDevices)
        .catch(() => setAvailableDevices([]));
    };

    mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, []);

  // Switch camera when user selects device
  const handleDeviceChange = async (deviceId: string) => {
    const previousStream = streamRef.current;

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId === 'default' ? { facingMode: 'environment' } : { deviceId: { exact: deviceId } },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      previousStream?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        void videoRef.current.play().catch(() => undefined);
      }
      setCameraDevice(deviceId);
      setIsCameraActive(true);
      setCameraError(null);
      setCameraNotice(null);
      setAvailableDevices(await getVideoInputs());
    } catch {
      // Keep the previous working stream if the requested camera cannot be opened.
      setCameraError('Could not switch to chosen device.');
    }
  };

  const handleSwitchCamera = async () => {
    let devices: MediaDeviceInfo[] = [];
    try {
      devices = await getVideoInputs();
      setAvailableDevices(devices);
    } catch {
      showCameraNotice('Unable to list camera devices.');
      return;
    }

    if (devices.length <= 1) {
      showCameraNotice(devices.length === 0 ? 'No camera devices detected.' : 'Only one camera is available on this device.');
      return;
    }

    const currentIndex = devices.findIndex((device) => device.deviceId === cameraDevice);
    const nextDevice = devices[(currentIndex + 1) % devices.length];
    await handleDeviceChange(nextDevice.deviceId);
  };

  // 2. Real Frame Capture + OCR Processing Pipeline
  const handleCaptureAndSolve = async () => {
    setIsProcessingCapture(true);
    setCaptureFeedbackText('Capturing Optical Frame...');

    try {
      let imageUri: string | null = null;

      // 1. If camera active, crop ONLY the Region of Interest and binarize
      if (isCameraActive && videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const rawCanvas = canvasRef.current;
        rawCanvas.width = video.videoWidth || 1280;
        rawCanvas.height = video.videoHeight || 720;
        const ctx = rawCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, rawCanvas.width, rawCanvas.height);

          // The targeting amber box corresponds to 78% width, 58% height centered
          const roiRatio = {
            x: (1 - 0.78) / 2,
            y: (1 - 0.58) / 2,
            width: 0.78,
            height: 0.58,
          };

          const { preprocessCameraFrame } = await import('@/lib/engine/preprocessor');
          const { croppedDataUrl, binarizedDataUrl } = preprocessCameraFrame(rawCanvas, roiRatio);
          imageUri = binarizedDataUrl;
          setCapturedSnapshot(croppedDataUrl);
        }
      }

      let rawOcrText = '';
      let confScore = 95.0;
      let engineLabel = 'Hybrid OCR (Tesseract + Gemini)';


      // ----------------------------------------------------
      // PHASE 1: Run Local WASM Tesseract.js (Optical Symbol Scan)
      // Extracts local bounding/character recognition tokens
      // ----------------------------------------------------
      let localTesseractCandidate = '';
      let tesseractConfidence = 0;

      const targetImage = capturedSnapshot || imageUri || (canvasRef.current ? canvasRef.current.toDataURL('image/jpeg', 0.9) : null);

      if (ocrEngine !== 'gemini') {
        try {
          setCaptureFeedbackText('Step 1/2: Optical Symbol Scan (Tesseract)...');
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');

          await worker.setParameters({
            tessedit_char_whitelist: '0123456789+-*/=^()xyzXYZabAB ',
            tessedit_pageseg_mode: '7' as unknown as import('tesseract.js').PSM,
          });

          if (imageUri) {
            const ret1 = await worker.recognize(imageUri);
            if (ret1.data.text) {
              localTesseractCandidate = ret1.data.text.trim();
              tesseractConfidence = ret1.data.confidence || 0;
            }
          }

          if ((!localTesseractCandidate || !/[+\-*/=a-zA-Z]/.test(localTesseractCandidate)) && capturedSnapshot) {
            await worker.setParameters({
              tessedit_pageseg_mode: '6' as unknown as import('tesseract.js').PSM,
            });
            const ret2 = await worker.recognize(capturedSnapshot);
            if (ret2.data.text) {
              localTesseractCandidate = ret2.data.text.trim();
              tesseractConfidence = ret2.data.confidence || tesseractConfidence;
            }
          }

          await worker.terminate();
        } catch (tessErr) {
          console.warn('Tesseract scan skipped or failed:', tessErr);
        }
      }

      // ----------------------------------------------------
      // PHASE 2: Gemini Vision AI Reconciles Tesseract Data
      // Passes BOTH image pixels AND Tesseract candidate tokens
      // to cross-verify and produce the best combined output
      // ----------------------------------------------------
      let geminiSuccess = false;

      if (ocrEngine !== 'wasm' && targetImage) {
        try {
          setCaptureFeedbackText('Step 2/2: Reconciling with Gemini Vision...');
          const res = await fetch('/api/ocr/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: targetImage,
              mimeType: 'image/jpeg',
              ocrHint: localTesseractCandidate || undefined,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.expression && data.expression.trim().length > 0) {
              rawOcrText = data.expression.trim();
              confScore = data.confidence || 98.0;
              geminiSuccess = true;
              engineLabel = localTesseractCandidate ? 'Ensemble: Tesseract + Gemini' : 'Gemini 2.5 Flash';
            }
          }
        } catch (apiErr) {
          console.warn('Gemini endpoint error, will fallback to Tesseract output:', apiErr);
        }
      }

      // If Gemini was offline or disabled, use the local Tesseract candidate
      if (!geminiSuccess) {
        rawOcrText = localTesseractCandidate;
        confScore = tesseractConfidence || 75.0;
        engineLabel = 'Local Tesseract';
      }


      setActiveEngineUsed(engineLabel);

      // Clean and normalize using engine normalizer
      const { normalizeMathExpression } = await import('@/lib/engine/normalizer');
      const normalizedOcr = normalizeMathExpression(rawOcrText);

      if (!normalizedOcr || normalizedOcr.length < 2) {
        setCaptureFeedbackText('No math symbols detected. Reposition camera.');
        setCameraError('Could not read math symbols. Hold camera steady, ensure good lighting, and align inside the amber box.');
        setIsProcessingCapture(false);
        return;
      }

      setCameraError(null);
      setOcrConfidence(Number(confScore.toFixed(1)));
      setCurrentExpression(normalizedOcr);
      setEditBuffer(normalizedOcr);
      setIsEditingConfirm(true);
      setHistoryId(null);
      setHistoryNotice(null);
      setIsCaptureStarred(false);

      setCaptureFeedbackText(`Recognized via ${engineLabel}. Confirm the expression to solve.`);
      setTimeout(() => {
        setIsProcessingCapture(false);
        setCaptureFeedbackText(null);
      }, 1400);
    } catch (err: unknown) {
      console.warn('OCR error during capture:', err);
      const msg = err instanceof Error ? err.message : 'Camera capture error';
      setCameraError(msg);
      setCaptureFeedbackText('Recognition error');
      setTimeout(() => {
        setIsProcessingCapture(false);
        setCaptureFeedbackText(null);
      }, 1500);
    }
  };

  // 3. Confirm Step: Solve edited expression
  const handleConfirmEdit = async () => {
    const sol = solveMathProblem(editBuffer);
    if (!sol.success) {
      setCameraError(sol.error || 'The expression could not be solved. Check the syntax.');
      return;
    }

    setCurrentExpression(sol.normalizedExpression);
    setEditBuffer(sol.normalizedExpression);
    setSolution(sol);
    setIsEditingConfirm(false);
    setCameraError(null);

    if (currentExpression && currentExpression !== sol.normalizedExpression) {
      void fetch('/api/ocr/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recognizedText: currentExpression,
          correctedText: sol.normalizedExpression,
          confidence: ocrConfidence,
          engine: activeEngineUsed,
        }),
      }).catch(() => undefined);
    }

    try {
      const record = await saveHistory({
        expression: sol.normalizedExpression,
        latex: sol.finalAnswerLatex || sol.normalizedExpression,
        recognizedText: currentExpression,
        problemType: sol.problemType,
        inputType: 'camera',
        finalAnswerPlain: sol.finalAnswerPlain,
        finalAnswerLatex: sol.finalAnswerLatex,
        isVerified: sol.isVerified,
        steps: sol.steps,
      });
      setHistoryId(record.id);
      setHistoryNotice('Confirmed result saved to Notebook.');
    } catch {
      setHistoryId(null);
      setHistoryNotice('Could not save this result to Notebook.');
    }
  };

  const handleCaptureFavorite = async () => {
    if (!historyId) return;
    const next = !isCaptureStarred;
    setIsCaptureStarred(next);
    try {
      await setHistoryFavorite(historyId, next);
      setHistoryNotice(next ? 'Saved to Favorites.' : 'Removed from Favorites.');
    } catch {
      setIsCaptureStarred(!next);
      setHistoryNotice('Could not update Favorites.');
    }
  };

  const handleCopyCaptureLatex = async () => {
    try {
      await navigator.clipboard.writeText(solution.finalAnswerLatex || 'x \\in \\{2, 3\\}');
      setCopiedCaptureType('latex');
      setTimeout(() => setCopiedCaptureType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handleCopyCaptureSteps = async () => {
    try {
      const stepText = solution.steps.map((s) => `${s.stepNumber}. ${s.title}: ${s.description} (${s.mathExpression})`).join('\n');
      await navigator.clipboard.writeText(stepText || 'Standard Form: x^2 - 5x + 6 = 0');
      setCopiedCaptureType('steps');
      setTimeout(() => setCopiedCaptureType(null), 1800);
    } catch {
      // fallback
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full px-margin py-space-lg flex flex-col gap-space-lg max-w-[1520px] mx-auto">
        {/* Top Metadata & Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md border-b border-hairline pb-space-sm">
          <div className="flex flex-col gap-1.5 max-w-3xl">
            <div className="flex items-center gap-space-sm flex-wrap">
             
              <span className="font-code-sm text-code-sm text-ink-muted">CLIENT RUNTIME CAS</span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-ink tracking-tight font-semibold">
              Capture Photo &amp; Solve
            </h1>
            <p className="font-body-lg text-body-lg text-ink-muted leading-relaxed">
                Align a handwritten note or printed problem inside the frame, capture it, then review the recognized expression before solving.
            </p>
          </div>

          {/* Engine Status Dashboard Strip */}
          <div className="grid w-full grid-cols-3 gap-2 self-start rounded-xl border border-hairline bg-surface p-2.5 shadow-card sm:flex sm:w-auto sm:items-center sm:gap-space-md lg:self-auto">
            <div className="flex min-w-0 flex-col border-r border-hairline pr-2 sm:px-space-xs sm:pr-space-md">
              <span className="font-caption text-[9px] leading-tight text-ink-muted uppercase sm:text-caption">
                <span className="sm:hidden">Engine</span>
                <span className="hidden sm:inline">Execution Target</span>
              </span>
              <span className="font-code-sm whitespace-nowrap text-[11px] font-bold text-ink sm:text-code-sm">
                <span className="mr-1 inline-block h-2 w-2 rounded-full bg-sage align-middle"></span>
                TypeScript CAS
              </span>
            </div>
            <div className="flex min-w-0 flex-col border-r border-hairline pr-2 sm:px-space-xs sm:pr-space-md">
              <span className="font-caption text-[9px] leading-tight text-ink-muted uppercase sm:text-caption">
                <span className="sm:hidden">Time</span>
                <span className="hidden sm:inline">Latency</span>
              </span>
              <span className="font-code-sm whitespace-nowrap text-[11px] font-bold text-ink sm:text-code-sm">
                {solution.executionTimeMs} ms
              </span>
            </div>
            <div className="flex min-w-0 flex-col sm:px-space-xs">
              <span className="font-caption text-[9px] leading-tight text-ink-muted uppercase sm:text-caption">
                <span className="sm:hidden">AI</span>
                <span className="hidden sm:inline">AI Scope</span>
              </span>
              <span className="font-code-sm flex items-center gap-1 whitespace-nowrap text-[11px] font-bold text-secondary sm:text-code-sm">
                <span className="material-symbols-outlined text-[13px] sm:text-[14px]">shield</span>
                <span className="sm:hidden">OCR</span>
                <span className="hidden truncate sm:inline">OCR only</span>
              </span>
            </div>
          </div>
        </section>

        {/* Main Two-Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
          {/* LEFT COLUMN: Live Viewfinder & Optical Capture Engine */}
          <section className="xl:col-span-6 flex flex-col gap-space-md">
            {/* Viewfinder Outer Housing */}
            <div className="relative flex w-full flex-col gap-2 overflow-hidden rounded-xl bg-ink p-2 shadow-md sm:gap-space-sm sm:p-space-sm">
              {/* Top Utility Bar within Camera HUD */}
              <div className="relative z-20 flex min-w-0 items-center justify-between gap-1.5 rounded-lg bg-ink/80 px-2 py-1.5 backdrop-blur-md sm:gap-space-sm sm:px-space-sm sm:py-1">
                <div className="flex min-w-0 items-center gap-1.5 sm:gap-space-xs">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${isCameraActive ? 'bg-secondary animate-pulse' : 'bg-amber'}`}></span>
                  <span className="whitespace-nowrap font-code-sm text-[10px] tracking-wider text-white sm:text-code-sm">
                    <span className="sm:hidden">{isCameraActive ? 'LIVE' : 'OPTICAL'}</span>
                    <span className="hidden sm:inline">{isCameraActive ? 'LIVE WEBCAM' : 'OPTICAL FEED'}</span>
                  </span>
                  <span className="hidden font-code-sm text-code-sm text-surface-dim opacity-70 sm:inline">
                    | {availableDevices.length > 0 ? `${availableDevices.length} CAM` : 'DEV:0'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1 sm:gap-space-xs">
                  <div className="relative inline-block text-left">
                    <select
                      value={cameraDevice}
                      onChange={(e) => handleDeviceChange(e.target.value)}
                      className="h-11 max-w-[92px] cursor-pointer appearance-none truncate rounded-lg bg-surface-container-highest/20 py-0 pl-2 pr-7 font-code-sm text-[10px] text-white transition-colors hover:bg-surface-container-highest/30 focus:outline-none sm:h-8 sm:max-w-none sm:pl-space-sm sm:pr-7 sm:text-code-sm"
                      id="camera-select"
                      aria-label="Select camera"
                    >
                      <option className="bg-ink text-white" value="default">Default</option>
                      {availableDevices.map((d, idx) => (
                        <option key={d.deviceId || idx} className="bg-ink text-white" value={d.deviceId}>
                          {d.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[16px] text-white">expand_more</span>
                  </div>
                  <button
                    onClick={() => setCompositionGrid(!compositionGrid)}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors cursor-pointer sm:h-7 sm:w-7 ${
                      compositionGrid ? 'bg-amber text-ink' : 'bg-surface-container-highest/20 hover:bg-surface-container-highest/40 text-white'
                    }`}
                    id="grid-toggle-btn"
                    aria-label="Toggle composition grid"
                    aria-pressed={compositionGrid}
                    title="Toggle Composition Grid"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">grid_4x4</span>
                  </button>
                  <button
                    onClick={() => setFlashActive(!flashActive)}
                    className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors cursor-pointer sm:h-7 sm:w-7 ${
                      flashActive ? 'bg-amber text-ink' : 'bg-surface-container-highest/20 hover:bg-surface-container-highest/40 text-white'
                    }`}
                    id="flash-toggle-btn"
                    aria-label="Toggle contrast illumination"
                    aria-pressed={flashActive}
                    title="Toggle Contrast Illumination"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">flashlight_on</span>
                  </button>
                </div>
              </div>

              {/* Camera Stream / Video Surface */}
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-ink select-none flex items-center justify-center">
                {cameraError && (
                  <div className="absolute inset-x-2 top-2 z-30 flex flex-col items-center gap-1.5 rounded-lg bg-error/95 px-3 py-2 text-center text-[11px] font-medium text-white sm:inset-x-4 sm:top-12 sm:text-xs">
                    <span>{cameraError}</span>
                    <Link
                      href="/solve/upload"
                      className="inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-semibold text-error hover:bg-surface transition-colors shadow-xs"
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      Switch to File Upload Instead
                    </Link>
                  </div>
                )}
                {isCameraActive ? (

                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${flashActive ? 'brightness-125 contrast-125' : ''}`}
                  />
                ) : (
                  <div
                    className="absolute inset-0 bg-cover bg-center brightness-[0.92] contrast-[1.08] transition-transform duration-300"
                    style={{
                      backgroundImage: capturedSnapshot
                        ? `url('${capturedSnapshot}')`
                        : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBt68hWEVG72TdAuh8Y7q4hqn8skKXpdJg4Gt1EEFNJG5LW2SZ6MoD5-3tPdsMUFRLBTUcLtvvQsppFpx_WZLRQKU5a7k-GFguIvnd2WtrHy-YTKZXu0s966vjvDKXtCVjDlPDHKqQgIf9PFHpNs55jD3rLc-P5JfwdkYQlGw1bUsLhopkjqgyH0xtRwxFjdZa1knpB6pAwtXaqAN_NIbkxmMA287h_XpslJYCJVwCQMZbU2dBpZOfRHA')",
                    }}
                  />
                )}

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
                {!cameraError && (
                  <div className="pointer-events-none absolute inset-x-2 top-2 z-20 flex justify-center sm:top-space-md">
                    <div className="flex max-w-full items-center gap-1 rounded-full bg-ink/80 px-2 py-0.5 shadow-sm backdrop-blur-md sm:gap-space-xs sm:px-space-md sm:py-1">
                      <span className="h-1.5 w-1.5 shrink-0 animate-ping rounded-full bg-amber"></span>
                      <span className="truncate whitespace-nowrap font-code-sm text-[10px] tracking-tight text-white sm:text-code-sm">
                        <span className="sm:hidden">Align equation inside frame</span>
                        <span className="hidden sm:inline">Align equation within amber corner guides</span>
                      </span>
                    </div>
                  </div>
                )}

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

                  {/* Center Bounding Box Scan Line */}
                  <div className="w-full h-full relative overflow-hidden rounded bg-amber/5 flex items-center justify-center">
                    <div className="absolute inset-x-0 h-0.5 bg-amber opacity-80 animate-[bounce_3s_infinite] shadow-[0_0_12px_rgba(219,149,88,1)]"></div>
                    <span className="max-w-full truncate rounded bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-amber sm:px-2 sm:font-code-sm sm:tracking-widest">
                      <span className="sm:hidden">Scan area</span>
                      <span className="hidden sm:inline">AST • LATEX DETECTED</span>
                    </span>
                  </div>
                </div>

                {/* Optical Shutter Button Pin */}
                <div className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-1 sm:flex">
                  <button
                    onClick={handleCaptureAndSolve}
                    className="w-16 h-16 rounded-full bg-surface/20 backdrop-blur-md p-1 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer group"
                    id="shutter-trigger"
                    aria-label="Capture frame"
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
                <div className="absolute inset-x-2 bottom-2 z-20 flex items-center justify-between rounded bg-ink/80 px-2 py-1 font-code-sm text-[10px] text-surface-dim backdrop-blur-sm sm:inset-x-space-xs sm:bottom-space-xs sm:px-space-sm sm:text-code-sm">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-space-sm">
                    <span className="flex shrink-0 items-center gap-1 text-secondary-fixed">
                      <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
                      LIVE
                    </span>
                    <span className="hidden truncate text-surface-dim opacity-70 sm:inline">{activeEngineUsed}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-space-sm">
                    <span className="whitespace-nowrap text-surface-dim">
                      <span className="sm:hidden">{ocrConfidence > 0 ? `Conf ${ocrConfidence}%` : 'OCR ready'}</span>
                      <span className="hidden sm:inline">{ocrConfidence > 0 ? `Confidence: ${ocrConfidence}%` : 'OCR ready'}</span>
                    </span>
                    <span className="hidden font-mono text-amber sm:inline">{solution.executionTimeMs}ms</span>
                  </div>
                </div>
              </div>


              {/* Bottom Viewfinder Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-space-sm pt-space-xs">
                <button
                  onClick={handleCaptureAndSolve}
                  className="flex h-14 w-full cursor-pointer items-center justify-center gap-space-xs rounded-full bg-amber px-3 text-center text-[13px] font-semibold leading-tight text-ink shadow-sm transition-all hover:bg-primary-fixed active:scale-[0.99] sm:flex-1 sm:text-body-lg"
                  id="btn-primary-capture"
                  type="button"
                >
                  {isProcessingCapture ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                      <span>{captureFeedbackText || 'Analyzing Frame...'}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">bolt</span>
                      <span>Capture &amp; Solve Instantly</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSwitchCamera}
                  className="flex h-12 w-full cursor-pointer items-center justify-center gap-space-xs rounded-full bg-surface-container-highest/20 px-space-lg font-body-sm text-body-sm text-white transition-colors hover:bg-surface-container-highest/30 sm:w-auto"
                  id="btn-retake"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">cached</span>
                  <span>Switch Camera</span>
                </button>
              </div>
              {cameraNotice && (
                <p role="status" aria-live="polite" className="px-2 pb-1 text-center font-code-sm text-[11px] text-amber sm:text-left">
                  {cameraNotice}
                </p>
              )}
            </div>
          </section>

          {/* RIGHT COLUMN: OCR Confirmation, Canonical Proof & Step Derivation */}
          <section className="xl:col-span-6 flex flex-col gap-space-md">
            {/* OCR Extraction & Confirmation Card (FR-CE) */}
            <div className="rounded-xl bg-surface p-space-md shadow-card flex flex-col gap-space-md border border-hairline">
              <div className="flex items-center justify-between flex-wrap gap-space-xs">
                <div className="flex items-center gap-space-xs">
                  <span className="rounded-full bg-secondary-fixed px-space-sm py-0.5 font-code-sm text-[10px] font-medium text-on-secondary-fixed sm:text-code-sm">
                    <span className="sm:hidden">{ocrConfidence > 0 ? `OCR ${ocrConfidence}%` : 'OCR pending'}</span>
                    <span className="hidden sm:inline">{ocrConfidence > 0 ? `OCR Confidence: ${ocrConfidence}%` : 'OCR pending'}</span>
                  </span>
                  <span className="max-w-[130px] truncate font-code-sm text-[10px] font-medium text-ink-muted sm:max-w-none sm:text-code-sm">{activeEngineUsed}</span>
                </div>
                <div className="flex items-center gap-1 text-secondary font-code-sm text-code-sm">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{solution.problemType}</span>
                </div>
              </div>

              {/* Editable Parsed Expression Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-sm items-center p-space-sm rounded-lg bg-surface-container-low border border-hairline">
                <div className="sm:col-span-4 lg:col-span-3 h-16 rounded overflow-hidden relative flex items-center justify-center bg-surface-container-high">
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: capturedSnapshot
                        ? `url('${capturedSnapshot}')`
                        : "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAicvng8bkIaCj4c4kjkdQrO3dWI042mZSjM17-8G_57A0f8mY_8fs9GzVJVT7cSp062Yz6PAkj4Go8SMtYxVFmnce5s_LlULvBbc596RpYADVII7ZI4ERdoQIfcFx_7y0EiYHhzaQUqUL2hNunJbdV8K_NkYdoARg_hnvgAv2axbnCyaP3GoawngUvCsHwxm5R-y4Mz2EQfbdaa83QEYtrfef3IQACXw-_0kLPX2RphmTj85iIyeGHFA')",
                    }}
                  />
                  <div className="absolute inset-1 rounded bg-amber/15 shadow-[inset_0_0_0_1.5px_#DB9558]"></div>
                  <span className="relative z-10 font-code-sm text-[10px] bg-ink/80 text-amber px-1.5 py-0.2 rounded font-mono">ROI CROP</span>
                </div>
                <div className="sm:col-span-8 lg:col-span-9 flex flex-col justify-center px-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-caption text-caption text-ink-muted uppercase tracking-wider">Recognized Expression</span>
                    <button
                      onClick={() => setIsEditingConfirm(!isEditingConfirm)}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>{isEditingConfirm ? 'Close' : 'Edit Equation'}</span>
                    </button>
                  </div>
                  {isEditingConfirm ? (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={editBuffer}
                        onChange={(e) => setEditBuffer(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-surface border border-hairline font-mono text-sm text-ink focus:outline-none focus:ring-1 focus:ring-amber"
                        placeholder="e.g. 3x - 30 = 0"
                      />
                      <button
                        onClick={handleConfirmEdit}
                        className="whitespace-nowrap shrink-0 px-3.5 py-1.5 rounded-lg bg-amber text-ink font-semibold text-xs shadow-xs hover:brightness-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">bolt</span>
                        <span>Confirm &amp; Solve</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-space-sm pt-0.5">
                      <span className="font-headline-sm text-headline-sm text-ink tracking-normal font-serif italic">
                        {currentExpression}
                      </span>
                      <span className="px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-code-sm text-caption font-semibold">
                        Parsed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Canonical Answer Hero Card */}
            <div className="rounded-xl bg-surface p-space-lg shadow-card flex flex-col gap-space-md relative overflow-hidden border border-hairline">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-amber"></div>
              <div className="flex items-center justify-between">
                <span className="font-code-sm text-code-sm uppercase tracking-widest text-amber font-semibold">
                  Final Solution
                </span>
                <span className="inline-flex items-center gap-1 px-space-sm py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-code-sm text-code-sm font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  ✓ {solution.verificationDetails.status}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-space-sm py-space-xs">
                <div className="flex items-baseline gap-space-md">
                  <span className="font-headline-xl text-headline-xl text-ink font-serif italic tracking-tight">
                    {solution.finalAnswerPlain}
                  </span>
                  <span className="font-code-input text-code-input text-ink-muted font-mono">
                    {solution.finalAnswerLatex}
                  </span>
                </div>
                {solution.roots && (
                  <div className="flex items-center gap-space-xs">
                    <span className="px-space-sm py-1 rounded bg-surface-container font-code-sm text-code-sm text-ink">
                      Roots: {solution.roots.length}
                    </span>
                  </div>
                )}
              </div>
              <div className="p-space-sm rounded-lg bg-olive-tint-soft flex items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-xs text-secondary font-body-sm text-code-sm">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>{solution.isVerified ? "Verified by substitution and exact arithmetic" : "Run a supported expression to verify"}</span>
                </div>
                <span className="font-code-sm text-caption text-secondary shrink-0 font-medium">Deterministic CAS</span>
              </div>
            </div>


            {/* Complete Written Solution in Text Form (One Go) */}
            <CompleteSolutionNarrative
              solution={solution}
              originalProblem={currentExpression}
              idPrefix="capture-narrative"
            />

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
                  onClick={handleCaptureFavorite}
                  disabled={!historyId}
                  className={`w-9 h-9 rounded-full bg-surface hover:bg-surface-container shadow-sm text-ink flex items-center justify-center transition-colors border border-hairline ${
                    historyId ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed'
                  } ${isCaptureStarred ? 'text-amber' : ''}`}
                  id="star-btn"
                  title={historyId ? 'Favorite in Notebook' : 'Confirm a result to save it'}
                  type="button"
                  aria-pressed={isCaptureStarred}
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
                onClick={() => {
                  setIsEditingConfirm(false);
                  setCameraError(null);
                  setHistoryNotice(null);
                  setOcrConfidence(0);
                  setCapturedSnapshot(null);
                }}
                className="px-space-lg p-2 rounded-full bg-amber text-ink font-body-sm text-body-sm font-semibold flex items-center gap-1.5 hover:bg-primary-fixed transition-colors shadow-sm cursor-pointer"
                id="solve-another-btn"
                type="button"
              >
                <span>Capture Another</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
            {historyNotice && (
              <p role="status" className="font-code-sm text-[11px] text-ink-muted">
                {historyNotice}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
