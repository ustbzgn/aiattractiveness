'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  Layers,
  SplitSquareVertical,
  ScanFace,
  ImagePlus,
  ArrowRight,
  Loader2,
  Check,
  CheckCircle2,
  CreditCard,
  Coins,
  Star,
  Award,
  Trophy,
  Lightbulb,
} from 'lucide-react';
import { messages } from '@/lib/messages/en';
import { APP_CONFIG, CREDIT_PACKAGES } from '@/lib/config';
import type {
  PortraitAnalysisResult,
  PortraitComparisonResult,
} from '@/lib/ai/deepseek';

type TabType = 'fast' | 'deep' | 'compare';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('fast');

  // Single upload state (for fast & deep)
  const [singleFile, setSingleFile] = useState<File | null>(null);
  const [singlePreview, setSinglePreview] = useState<string | null>(null);

  // Compare upload state (two slots)
  const [compareFileA, setCompareFileA] = useState<File | null>(null);
  const [comparePreviewA, setComparePreviewA] = useState<string | null>(null);
  const [compareFileB, setCompareFileB] = useState<File | null>(null);
  const [comparePreviewB, setComparePreviewB] = useState<string | null>(null);

  // Feedback & sample report display state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showApiNotice, setShowApiNotice] = useState<boolean>(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // AI analysis execution state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSimulatingScan, setIsSimulatingScan] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [scanStageText, setScanStageText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<PortraitAnalysisResult | null>(null);
  const [comparisonResult, setComparisonResult] = useState<PortraitComparisonResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const reportSectionRef = useRef<HTMLDivElement | null>(null);

  // Conversion Paywall Modal (direct pop-up on scan completion)
  const [unlockModalOpen, setUnlockModalOpen] = useState<boolean>(false);
  const [billingPeriod, setBillingPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('weekly_gold');
  const [purchasingPackId, setPurchasingPackId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Hidden file input refs
  const singleInputRef = useRef<HTMLInputElement | null>(null);
  const compareInputARef = useRef<HTMLInputElement | null>(null);
  const compareInputBRef = useRef<HTMLInputElement | null>(null);

  // Validation helper
  const validateFile = (file: File): string | null => {
    const validMimes = APP_CONFIG.allowedMimeTypes as readonly string[];
    if (!validMimes.includes(file.type)) {
      return messages.validation.invalidType;
    }
    if (file.size > APP_CONFIG.maxUploadSizeBytes) {
      return messages.validation.fileTooLarge;
    }
    return null;
  };

  // Single file handlers
  const handleSingleFileSelect = (file: File | undefined) => {
    if (!file) return;
    setValidationError(null);
    setShowApiNotice(false);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    if (singlePreview) {
      URL.revokeObjectURL(singlePreview);
    }
    setSingleFile(file);
    setSinglePreview(URL.createObjectURL(file));
  };

  const removeSingleImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (singlePreview) {
      URL.revokeObjectURL(singlePreview);
    }
    setSingleFile(null);
    setSinglePreview(null);
    setValidationError(null);
    setShowApiNotice(false);
    if (singleInputRef.current) singleInputRef.current.value = '';
  };

  // Compare file handlers
  const handleCompareSelectA = (file: File | undefined) => {
    if (!file) return;
    setValidationError(null);
    setShowApiNotice(false);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    if (comparePreviewA) {
      URL.revokeObjectURL(comparePreviewA);
    }
    setCompareFileA(file);
    setComparePreviewA(URL.createObjectURL(file));
  };

  const removeCompareA = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (comparePreviewA) {
      URL.revokeObjectURL(comparePreviewA);
    }
    setCompareFileA(null);
    setComparePreviewA(null);
    setValidationError(null);
    setShowApiNotice(false);
    if (compareInputARef.current) compareInputARef.current.value = '';
  };

  const handleCompareSelectB = (file: File | undefined) => {
    if (!file) return;
    setValidationError(null);
    setShowApiNotice(false);

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    if (comparePreviewB) {
      URL.revokeObjectURL(comparePreviewB);
    }
    setCompareFileB(file);
    setComparePreviewB(URL.createObjectURL(file));
  };

  const removeCompareB = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (comparePreviewB) {
      URL.revokeObjectURL(comparePreviewB);
    }
    setCompareFileB(null);
    setComparePreviewB(null);
    setValidationError(null);
    setShowApiNotice(false);
    if (compareInputBRef.current) compareInputBRef.current.value = '';
  };

  // Keyboard accessibility triggers for dropzone
  const handleKeyDownDropzone = (
    e: React.KeyboardEvent,
    triggerRef: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      triggerRef.current?.click();
    }
  };

  // Simulated scan animation and automatic modal pop-up on completion
  const startSimulatedScan = () => {
    setIsSimulatingScan(true);
    setScanProgress(0);
    setScanStageText('Scanning portrait lighting & key contrast...');

    const startTime = Date.now();
    const duration = 3400; // 3.4 seconds realistic diagnostic scan

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.floor((elapsed / duration) * 100), 100);

      setScanProgress(pct);

      if (pct < 28) {
        setScanStageText('Scanning facial lighting & key contrast...');
      } else if (pct < 62) {
        setScanStageText('Calculating framing angles & headroom balance...');
      } else if (pct < 88) {
        setScanStageText('Evaluating natural expression & eye sharpness...');
      } else {
        setScanStageText('Portrait diagnostics completed! Preparing report...');
      }

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsSimulatingScan(false);
          setUnlockModalOpen(true);
        }, 450);
      }
    }, 60);
  };

  // Action trigger: Run analysis / comparison
  const handleRunAnalysis = async () => {
    setValidationError(null);
    setAnalysisError(null);

    if (activeTab === 'compare') {
      if (!compareFileA || !compareFileB) {
        setValidationError(messages.upload.emptyStateCompare);
        return;
      }
    } else {
      if (!singleFile) {
        setValidationError(messages.upload.emptyStateSingle);
        return;
      }
    }

    // Check user credits first to determine whether to run real analysis or start simulated scan
    const requiredCredits = activeTab === 'fast' ? 10 : activeTab === 'deep' ? 40 : 50;
    let hasCredits = false;

    try {
      const creditRes = await fetch('/api/user/credits');
      if (creditRes.ok) {
        const creditData = await creditRes.json();
        if (typeof creditData.balance === 'number' && creditData.balance >= requiredCredits) {
          hasCredits = true;
        }
      }
    } catch {
      hasCredits = false;
    }

    // If unauthenticated or insufficient credits, start the realistic simulated scan -> popup modal
    if (!hasCredits) {
      startSimulatedScan();
      return;
    }

    // Authenticated user with sufficient credits -> run real AI portrait assessment
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setComparisonResult(null);
    setShowApiNotice(false);

    try {
      const formData = new FormData();
      formData.append('mode', activeTab);
      if (activeTab === 'compare') {
        formData.append('photoA', compareFileA!);
        formData.append('photoB', compareFileB!);
      } else {
        formData.append('photo', singleFile!);
      }

      const res = await fetch('/api/analysis/portrait', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      // If credits are insufficient on server check, start simulated scan
      if (res.status === 402 || json.code === 'INSUFFICIENT_CREDITS') {
        startSimulatedScan();
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to complete portrait evaluation.');
      }

      if (activeTab === 'compare') {
        setComparisonResult(json.data as PortraitComparisonResult);
      } else {
        setAnalysisResult(json.data as PortraitAnalysisResult);
      }

      // Broadcast event so Navbar updates credit counter instantly
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('refresh-user-credits'));
      }

      setTimeout(() => {
        reportSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Error communicating with portrait analysis service'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuickPurchase = async (packId: string) => {
    setPurchasingPackId(packId);
    setCheckoutError(null);

    try {
      const response = await fetch('/api/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setCheckoutError('Please sign in to complete your credit purchase.');
        } else {
          setCheckoutError(data.error || 'Failed to connect to checkout. Please try again.');
        }
        setPurchasingPackId(null);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError('Unable to generate checkout session.');
        setPurchasingPackId(null);
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Network error initiating checkout');
      setPurchasingPackId(null);
    }
  };

  return (
    <div className="max-w-[840px] mx-auto w-full">
      {/* Hero Header */}
      <section className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#f5d0d8] text-[#e05670] text-xs sm:text-sm font-semibold mb-4 shadow-xs">
          <ScanFace size={16} strokeWidth={2.2} />
          <span>Objective Portrait Guidance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[1.15] mb-4 text-[#1f1d1e] tracking-tight">
          {messages.hero.title}
        </h1>
        <p className="text-base sm:text-lg text-[#575254] max-w-[620px] mx-auto leading-relaxed">
          {messages.hero.subtitle}
        </p>
      </section>

      {/* Main Centered Test Panel */}
      <section className="card-panel p-6 sm:p-8 mb-12 relative overflow-hidden">
        {/* Soft Warm Ambient Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#fdf2f4] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Three Tabs - Clean Photography Diagnostic Modes */}
        <div className="tabs-container mb-6 max-w-[520px] mx-auto">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'fast' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('fast');
              setShowApiNotice(false);
              setValidationError(null);
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Camera size={14} />
              <span>Fast Test</span>
            </span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'deep' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('deep');
              setShowApiNotice(false);
              setValidationError(null);
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Layers size={14} />
              <span>Deep Scan</span>
            </span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('compare');
              setShowApiNotice(false);
              setValidationError(null);
            }}
          >
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <SplitSquareVertical size={14} />
              <span>Face Compare</span>
            </span>
          </button>
        </div>

        {/* Upload Zone Area */}
        {activeTab !== 'compare' ? (
          /* Single Image Upload (Fast Test / Deep Scan) */
          <div>
            {!singlePreview ? (
              <div
                className="viewfinder-dropzone group"
                role="button"
                tabIndex={0}
                aria-label={messages.upload.singleTitle}
                onClick={() => singleInputRef.current?.click()}
                onKeyDown={(e) => handleKeyDownDropzone(e, singleInputRef)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleSingleFileSelect(e.dataTransfer.files?.[0]);
                }}
              >
                {/* Viewfinder L-corners */}
                <div className="viewfinder-corner viewfinder-tl" />
                <div className="viewfinder-corner viewfinder-tr" />
                <div className="viewfinder-corner viewfinder-bl" />
                <div className="viewfinder-corner viewfinder-br" />

                <input
                  ref={singleInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleSingleFileSelect(e.target.files?.[0])}
                />
                <div className="w-14 h-14 rounded-2xl bg-[#fdf2f4] flex items-center justify-center mx-auto mb-3.5 text-[#e05670] shadow-xs group-hover:scale-105 transition-transform duration-200">
                  <ImagePlus size={26} strokeWidth={2} />
                </div>
                <h4 className="text-lg font-bold text-[#1f1d1e] mb-1">
                  {messages.upload.singleTitle}
                </h4>
                <p className="text-sm text-[#575254] mb-2 max-w-sm mx-auto">
                  {messages.upload.singleSubtitle}
                </p>
                <span className="text-xs text-[#8a8486] font-medium tracking-wide">
                  {messages.upload.constraints}
                </span>
              </div>
            ) : (
              /* Removable Preview for Single Image */
              <div className="relative rounded-2xl overflow-hidden border border-[#e2d3d6] bg-[#1f1d1e] text-center p-3 sm:p-4 shadow-md">
                {isSimulatingScan && <div className="scanner-laser-line" />}
                <button
                  type="button"
                  onClick={removeSingleImage}
                  disabled={isSimulatingScan}
                  title={messages.upload.remove}
                  aria-label={messages.upload.remove}
                  className="absolute top-3 right-3 bg-black/75 hover:bg-black text-white rounded-full w-8 h-8 flex items-center justify-center cursor-pointer z-30 transition-colors disabled:opacity-40"
                >
                  <X size={18} />
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={singlePreview}
                  alt="Portrait preview"
                  className="max-h-[380px] max-w-full mx-auto rounded-xl object-contain block"
                />
                <div className="mt-3 flex justify-between items-center text-[#faf8f9] text-xs px-2">
                  <span className="truncate max-w-[280px] font-medium">
                    {singleFile?.name}
                  </span>
                  <span>{singleFile ? (singleFile.size / (1024 * 1024)).toFixed(2) + ' MB' : ''}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Face Compare: Two Upload Slots */
          <div className="grid-compare">
            {/* Slot 1: Photo A */}
            <div>
              {!comparePreviewA ? (
                <div
                  className="viewfinder-dropzone py-8 px-4 group"
                  role="button"
                  tabIndex={0}
                  aria-label={messages.upload.compareSlot1}
                  onClick={() => compareInputARef.current?.click()}
                  onKeyDown={(e) => handleKeyDownDropzone(e, compareInputARef)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleCompareSelectA(e.dataTransfer.files?.[0]);
                  }}
                >
                  <div className="viewfinder-corner viewfinder-tl" />
                  <div className="viewfinder-corner viewfinder-tr" />
                  <div className="viewfinder-corner viewfinder-bl" />
                  <div className="viewfinder-corner viewfinder-br" />

                  <input
                    ref={compareInputARef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleCompareSelectA(e.target.files?.[0])}
                  />
                  <div className="w-11 h-11 rounded-xl bg-[#fdf2f4] flex items-center justify-center mx-auto mb-2 text-[#e05670] group-hover:scale-105 transition-transform">
                    <ImagePlus size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#1f1d1e] mb-1">Photo A (Baseline)</p>
                  <p className="text-xs text-[#8a8486]">{messages.upload.slotHint}</p>
                </div>
              ) : (
                <div className="relative rounded-xl border border-[#e2d3d6] overflow-hidden bg-[#1f1d1e] p-2">
                  {isSimulatingScan && <div className="scanner-laser-line" />}
                  <button
                    type="button"
                    onClick={removeCompareA}
                    disabled={isSimulatingScan}
                    title={messages.upload.remove}
                    aria-label={messages.upload.remove}
                    className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer z-30 transition-colors disabled:opacity-40"
                  >
                    <X size={15} />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comparePreviewA}
                    alt="Photo A preview"
                    className="max-h-[260px] w-full object-contain rounded-lg block"
                  />
                  <p className="text-xs text-[#faf8f9] mt-2 text-center truncate">
                    {compareFileA?.name}
                  </p>
                </div>
              )}
            </div>

            {/* Slot 2: Photo B */}
            <div>
              {!comparePreviewB ? (
                <div
                  className="viewfinder-dropzone py-8 px-4 group"
                  role="button"
                  tabIndex={0}
                  aria-label={messages.upload.compareSlot2}
                  onClick={() => compareInputBRef.current?.click()}
                  onKeyDown={(e) => handleKeyDownDropzone(e, compareInputBRef)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleCompareSelectB(e.dataTransfer.files?.[0]);
                  }}
                >
                  <div className="viewfinder-corner viewfinder-tl" />
                  <div className="viewfinder-corner viewfinder-tr" />
                  <div className="viewfinder-corner viewfinder-bl" />
                  <div className="viewfinder-corner viewfinder-br" />

                  <input
                    ref={compareInputBRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => handleCompareSelectB(e.target.files?.[0])}
                  />
                  <div className="w-11 h-11 rounded-xl bg-[#fdf2f4] flex items-center justify-center mx-auto mb-2 text-[#e05670] group-hover:scale-105 transition-transform">
                    <ImagePlus size={22} />
                  </div>
                  <p className="text-sm font-semibold text-[#1f1d1e] mb-1">Photo B (Alternative)</p>
                  <p className="text-xs text-[#8a8486]">{messages.upload.slotHint}</p>
                </div>
              ) : (
                <div className="relative rounded-xl border border-[#e2d3d6] overflow-hidden bg-[#1f1d1e] p-2">
                  {isSimulatingScan && <div className="scanner-laser-line" />}
                  <button
                    type="button"
                    onClick={removeCompareB}
                    disabled={isSimulatingScan}
                    title={messages.upload.remove}
                    aria-label={messages.upload.remove}
                    className="absolute top-2 right-2 bg-black/75 hover:bg-black text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer z-30 transition-colors disabled:opacity-40"
                  >
                    <X size={15} />
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={comparePreviewB}
                    alt="Photo B preview"
                    className="max-h-[260px] w-full object-contain rounded-lg block"
                  />
                  <p className="text-xs text-[#faf8f9] mt-2 text-center truncate">
                    {compareFileB?.name}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation or API Error Message Display */}
        {(validationError || analysisError) && (
          <div
            role="alert"
            className="mt-5 px-4 py-3 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] text-sm flex items-center gap-2.5"
          >
            <AlertTriangle size={18} className="shrink-0" />
            <span>{validationError || analysisError}</span>
          </div>
        )}

        {/* Simulated Scanning Progress Bar (Sunk Cost Hook) */}
        {isSimulatingScan && (
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-[#faf8f9] border border-[#f5d0d8] text-left animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-bold text-[#1f1d1e] flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-[#e05670]" />
                <span>{scanStageText}</span>
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#e05670]">
                {scanProgress}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#f0e6e8] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#e5657d] to-[#e05670] rounded-full transition-all duration-150 ease-out"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#8a8486] mt-2 text-center">
              Evaluating facial illumination, framing proportion, and portrait harmony...
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-8 text-center">
          <button
            type="button"
            className="btn btn-rose min-w-[240px] py-3 px-8 text-base shadow-lg shadow-[#e05670]/25 inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || isSimulatingScan}
          >
            {isSimulatingScan ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Evaluating Portrait ({scanProgress}%)...</span>
              </>
            ) : isAnalyzing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Analyzing Portrait...</span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === 'compare'
                    ? messages.upload.comparingAnalysis
                    : messages.upload.startAnalysis}
                </span>
                <ArrowRight size={18} strokeWidth={2} />
              </>
            )}
          </button>

          {/* Privacy & Transient Processing Notice */}
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#8a8486]">
            <span>Photos never saved · Deleted immediately after analysis</span>
          </div>
        </div>

        {/* API Feedback Notice */}
        {showApiNotice && (
          <div className="mt-8 rounded-2xl bg-[#fffbeb] border border-[#fde68a] p-5 text-left">
            <div className="flex items-start gap-3">
              <div className="p-1.5 rounded-full bg-[#fef3c7] text-[#b45309] mt-0.5">
                <Info size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-md">
                    {messages.apiFeedback.badge}
                  </span>
                  <h4 className="text-base font-bold text-[#78350f]">
                    {messages.apiFeedback.title}
                  </h4>
                </div>
                <p className="text-sm text-[#92400e] leading-relaxed mb-1.5">
                  {messages.apiFeedback.message}
                </p>
                <p className="text-xs text-[#a16207]">
                  {messages.apiFeedback.subtext}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Analysis Result (Rendered only after analysis is performed) */}
      {(comparisonResult || analysisResult) && (
        <section ref={reportSectionRef} className="card-panel p-6 sm:p-8 mb-12 relative overflow-hidden">
          {comparisonResult ? (
            /* Side-by-Side Comparison Live Result View */
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold tracking-wider uppercase bg-[#fdf2f4] text-[#e05670] px-3 py-1 rounded-md border border-[#f5d0d8] flex items-center gap-1.5">
                    <Trophy size={14} />
                    <span>Winner: {comparisonResult.winner}</span>
                  </span>
                  <span className="text-xs sm:text-sm text-[#8a8486] font-medium">
                    Studio Side-by-Side Verdict
                  </span>
                </div>
              </div>

              {/* Overall Verdict Banner */}
              <div className="p-5 bg-[#faf8f9] rounded-2xl border border-[#f0e6e8] mb-7">
                <h4 className="text-sm font-bold text-[#1f1d1e] mb-2 flex items-center gap-2">
                  <Award size={18} className="text-[#e05670]" />
                  <span>Overall Assessment</span>
                </h4>
                <p className="text-sm text-[#575254] leading-relaxed mb-4">
                  {comparisonResult.overallAssessment}
                </p>
                <div className="p-3.5 bg-white rounded-xl border border-[#f0e6e8]">
                  <strong className="text-xs font-bold text-[#e05670] block mb-1">
                    Recommendation for Profile Use:
                  </strong>
                  <p className="text-xs sm:text-sm text-[#1f1d1e]">
                    {comparisonResult.verdictRecommendation}
                  </p>
                </div>
              </div>

              {/* Photo A vs Photo B Side by Side Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo A Card */}
                <div className="p-5 rounded-2xl bg-white border border-[#f0e6e8]">
                  <div className="flex items-center justify-between mb-3 border-b border-[#f0e6e8] pb-3">
                    <h5 className="font-bold text-[#1f1d1e] text-base">Photo A (Baseline)</h5>
                    <span className="text-lg font-extrabold text-[#e05670]">
                      {comparisonResult.photoA.score}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-xs font-bold text-[#166534] block mb-1.5">Strengths:</span>
                    <ul className="text-xs sm:text-sm text-[#575254] space-y-1">
                      {comparisonResult.photoA.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#16a34a] font-bold">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {comparisonResult.photoA.weaknesses.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-[#991b1b] block mb-1.5">
                        Areas for Improvement:
                      </span>
                      <ul className="text-xs sm:text-sm text-[#575254] space-y-1">
                        {comparisonResult.photoA.weaknesses.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#dc2626] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Photo B Card */}
                <div className="p-5 rounded-2xl bg-white border border-[#f0e6e8]">
                  <div className="flex items-center justify-between mb-3 border-b border-[#f0e6e8] pb-3">
                    <h5 className="font-bold text-[#1f1d1e] text-base">Photo B (Alternative)</h5>
                    <span className="text-lg font-extrabold text-[#e05670]">
                      {comparisonResult.photoB.score}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-xs font-bold text-[#166534] block mb-1.5">Strengths:</span>
                    <ul className="text-xs sm:text-sm text-[#575254] space-y-1">
                      {comparisonResult.photoB.strengths.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-[#16a34a] font-bold">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {comparisonResult.photoB.weaknesses.length > 0 && (
                    <div>
                      <span className="text-xs font-bold text-[#991b1b] block mb-1.5">
                        Areas for Improvement:
                      </span>
                      <ul className="text-xs sm:text-sm text-[#575254] space-y-1">
                        {comparisonResult.photoB.weaknesses.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#dc2626] font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : analysisResult ? (
            /* Single Portrait Live Result View */
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold tracking-wider uppercase bg-[#fdf2f4] text-[#e05670] px-3 py-1 rounded-md border border-[#f5d0d8] flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Evaluation Completed</span>
                  </span>
                  <span className="text-xs sm:text-sm text-[#8a8486] font-medium">
                    Studio Portrait Assessment
                  </span>
                </div>
              </div>

              {/* Overall Score Highlight */}
              <div className="flex flex-col items-center justify-center py-7 px-6 bg-white rounded-2xl border border-[#f0e6e8] text-center mb-7 shadow-xs">
                <span className="text-5xl sm:text-6xl font-extrabold text-[#e05670] leading-none tracking-tight">
                  {analysisResult.overallScore}
                </span>
                <span className="text-sm sm:text-base font-bold text-[#1f1d1e] mt-2">
                  {analysisResult.scoreLabel}
                </span>
              </div>

              {/* Metric breakdown cards */}
              <h3 className="text-lg font-bold mb-4 text-[#1f1d1e]">
                Portrait Dimensions Evaluated
              </h3>
              <div className="metric-grid mb-7">
                {analysisResult.metrics.map((metric, idx) => (
                  <div key={idx} className="result-stat-card">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-bold text-[#1f1d1e]">{metric.name}</span>
                      <span className="text-sm font-extrabold text-[#e05670]">{metric.score}</span>
                    </div>
                    <p className="text-xs text-[#575254] leading-relaxed">{metric.note}</p>
                  </div>
                ))}
              </div>

              {/* Narrative feedback summary */}
              <div className="border-t border-[#f0e6e8] pt-5 mb-6">
                <h4 className="text-sm font-bold text-[#1f1d1e] mb-1.5">
                  {analysisResult.summaryHeading}
                </h4>
                <p className="text-sm text-[#575254] leading-relaxed">
                  {analysisResult.summaryText}
                </p>
              </div>

              {/* Recommendations */}
              {analysisResult.recommendations?.length > 0 && (
                <div className="p-4 bg-[#faf8f9] rounded-xl border border-[#f0e6e8]">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-[#e05670] mb-2 flex items-center gap-1.5">
                    <Lightbulb size={14} />
                    <span>Actionable Photography Tips</span>
                  </h5>
                  <ul className="space-y-1.5">
                    {analysisResult.recommendations.map((tip, i) => (
                      <li key={i} className="text-xs sm:text-sm text-[#575254] flex items-start gap-2">
                        <span className="text-[#e05670] font-bold">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </section>
      )}

      {/* Frequently Asked Questions */}
      <section className="mb-12">
        <div className="text-center mb-7">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f1d1e] mb-2 tracking-tight">
            {messages.faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[#575254]">
            Clear answers about photo requirements, analysis feedback, and one-time credits.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {messages.faq.items.map((item, idx) => {
            const isOpen = openFaqIndex === idx;
            const answerId = `faq-answer-${idx}`;
            const buttonId = `faq-btn-${idx}`;
            return (
              <div
                key={idx}
                className="card-panel overflow-hidden transition-all duration-200"
                style={{
                  borderColor: isOpen ? '#f5d0d8' : undefined,
                  boxShadow: isOpen ? '0 8px 24px -2px rgba(224, 86, 112, 0.08)' : undefined,
                }}
              >
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={answerId}
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className={`w-full flex justify-between items-center gap-4 p-4 sm:p-5 border-none cursor-pointer text-left font-inherit transition-colors ${
                    isOpen ? 'bg-[#faf8f9]' : 'bg-transparent'
                  }`}
                >
                  <span className="text-sm sm:text-base font-bold text-[#1f1d1e]">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#8a8486] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-[#e05670]' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <div
                    id={answerId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-4 pb-5 sm:px-5 sm:pb-5 border-t border-[#f0e6e8] bg-[#faf8f9]"
                  >
                    <p className="mt-3 text-sm text-[#575254] leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Unlock Portrait Report Pop-up Selection Modal (Referencing front-ref-imgs/pricing.png) */}
      {unlockModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unlock-modal-title"
        >
          <div className="card-panel w-full max-w-[420px] p-6 sm:p-7 bg-white border-[#f0e6e8] shadow-2xl relative rounded-[28px]">
            {/* Close Button */}
            <button
              type="button"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#faf8f9] hover:bg-[#f0e6e8] flex items-center justify-center text-[#8a8486] hover:text-[#1f1d1e] transition-colors"
              onClick={() => {
                setUnlockModalOpen(false);
                setCheckoutError(null);
              }}
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-5 pr-4 pl-4 pt-1">
              <h3 id="unlock-modal-title" className="text-2xl sm:text-[25px] font-black text-[#111827] tracking-tight leading-[1.2] mb-1.5">
                Unlock Your Full<br />Portrait Assessment
              </h3>
              <p className="text-xs sm:text-[13px] text-[#6b7280]">
                Your result is ready — see everything we found
              </p>
            </div>

            {/* 4 Value Propositions Checklist */}
            <div className="mb-5 space-y-2 px-1">
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-[#1f1d1e] font-semibold">
                <Check size={16} strokeWidth={2.6} className="text-[#e05670] shrink-0" />
                <span>Reveal all 6 portrait dimension scores</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-[#1f1d1e] font-semibold">
                <Check size={16} strokeWidth={2.6} className="text-[#e05670] shrink-0" />
                <span>Unlock facial harmony & symmetry analysis</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-[#1f1d1e] font-semibold">
                <Check size={16} strokeWidth={2.6} className="text-[#e05670] shrink-0" />
                <span>Get personalized glow-up & lighting suggestions</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-[13px] text-[#1f1d1e] font-semibold">
                <Check size={16} strokeWidth={2.6} className="text-[#e05670] shrink-0" />
                <span>High-precision portrait evaluation model</span>
              </div>
            </div>

            {/* Segmented Switcher: Weekly / Monthly */}
            <div className="bg-[#f8f6f7] p-1 rounded-2xl flex mb-4 border border-[#f0e6e8]">
              <button
                type="button"
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  billingPeriod === 'weekly'
                    ? 'bg-[#e05670] text-white shadow-xs'
                    : 'text-[#575254] hover:text-[#1f1d1e]'
                }`}
                onClick={() => {
                  setBillingPeriod('weekly');
                  setSelectedPlanId('weekly_gold');
                }}
              >
                Weekly
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                  billingPeriod === 'monthly'
                    ? 'bg-[#e05670] text-white shadow-xs'
                    : 'text-[#575254] hover:text-[#1f1d1e]'
                }`}
                onClick={() => {
                  setBillingPeriod('monthly');
                  setSelectedPlanId('monthly_gold');
                }}
              >
                Monthly
              </button>
            </div>

            {/* Error Display */}
            {checkoutError && (
              <div className="p-3 mb-3 rounded-xl bg-[#fff1f2] border border-[#fecdd3] text-[#be123c] text-xs">
                {checkoutError}
              </div>
            )}

            {/* Stacked Vertical Plan Cards */}
            <div className="flex flex-col gap-3 mb-5">
              {billingPeriod === 'weekly' ? (
                <>
                  {/* Weekly Silver */}
                  <div
                    onClick={() => setSelectedPlanId('weekly_silver')}
                    className={`relative rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all ${
                      selectedPlanId === 'weekly_silver'
                        ? 'border-2 border-[#e05670] bg-[#fdf2f4]/40 ring-2 ring-[#e05670]/15'
                        : 'border border-[#f0e6e8] bg-white hover:border-[#e2d3d6]'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-4 bg-black text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wider">
                      SAVE 42%
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#faf8f9] border border-[#f0e6e8] flex items-center justify-center text-[#8a8486] shrink-0">
                        <Coins size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-base text-[#1f1d1e]">Silver</div>
                        <div className="text-xs font-semibold text-[#e05670]">~$0.45 / test</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#8a8486] line-through mr-1.5">$3.9</span>
                      <span className="text-xl sm:text-2xl font-black text-[#e05670] leading-none">$1.9</span>
                      <div className="text-[11px] text-[#8a8486] font-medium mt-0.5">/ wk</div>
                    </div>
                  </div>

                  {/* Weekly Gold (Default selected) */}
                  <div
                    onClick={() => setSelectedPlanId('weekly_gold')}
                    className={`relative rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all ${
                      selectedPlanId === 'weekly_gold'
                        ? 'border-2 border-[#e05670] bg-[#fdf2f4]/40 ring-2 ring-[#e05670]/15'
                        : 'border border-[#f0e6e8] bg-white hover:border-[#e2d3d6]'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-4 bg-black text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wider">
                      SAVE 33%
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e05670] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Star size={18} fill="currentColor" />
                      </div>
                      <div>
                        <div className="font-bold text-base text-[#1f1d1e]">Gold</div>
                        <div className="text-xs font-semibold text-[#e05670]">~$0.35 / test</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#8a8486] line-through mr-1.5">$7.9</span>
                      <span className="text-xl sm:text-2xl font-black text-[#e05670] leading-none">$4.9</span>
                      <div className="text-[11px] text-[#8a8486] font-medium mt-0.5">/ wk</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Monthly Silver */}
                  <div
                    onClick={() => setSelectedPlanId('monthly_silver')}
                    className={`relative rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all ${
                      selectedPlanId === 'monthly_silver'
                        ? 'border-2 border-[#e05670] bg-[#fdf2f4]/40 ring-2 ring-[#e05670]/15'
                        : 'border border-[#f0e6e8] bg-white hover:border-[#e2d3d6]'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-4 bg-black text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wider">
                      SAVE 50%
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#faf8f9] border border-[#f0e6e8] flex items-center justify-center text-[#8a8486] shrink-0">
                        <Coins size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-base text-[#1f1d1e]">Silver</div>
                        <div className="text-xs font-semibold text-[#e05670]">~$0.25 / test</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#8a8486] line-through mr-1.5">$19.9</span>
                      <span className="text-xl sm:text-2xl font-black text-[#e05670] leading-none">$9.9</span>
                      <div className="text-[11px] text-[#8a8486] font-medium mt-0.5">/ mo</div>
                    </div>
                  </div>

                  {/* Monthly Gold (Default for Monthly) */}
                  <div
                    onClick={() => setSelectedPlanId('monthly_gold')}
                    className={`relative rounded-2xl p-3.5 sm:p-4 flex items-center justify-between cursor-pointer transition-all ${
                      selectedPlanId === 'monthly_gold'
                        ? 'border-2 border-[#e05670] bg-[#fdf2f4]/40 ring-2 ring-[#e05670]/15'
                        : 'border border-[#f0e6e8] bg-white hover:border-[#e2d3d6]'
                    }`}
                  >
                    <div className="absolute -top-2.5 right-4 bg-black text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md tracking-wider">
                      SAVE 60%
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#e05670] flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Star size={18} fill="currentColor" />
                      </div>
                      <div>
                        <div className="font-bold text-base text-[#1f1d1e]">Gold</div>
                        <div className="text-xs font-semibold text-[#e05670]">~$0.15 / test</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-[#8a8486] line-through mr-1.5">$249.9</span>
                      <span className="text-xl sm:text-2xl font-black text-[#e05670] leading-none">$99.9</span>
                      <div className="text-[11px] text-[#8a8486] font-medium mt-0.5">/ mo</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Long Full-Width Dark CTA Button */}
            {(() => {
              const currentPriceText =
                selectedPlanId === 'weekly_silver'
                  ? '$1.9/week'
                  : selectedPlanId === 'weekly_gold'
                  ? '$4.9/week'
                  : selectedPlanId === 'monthly_silver'
                  ? '$9.9/month'
                  : '$99.9/month';

              const targetPackId =
                selectedPlanId === 'weekly_silver'
                  ? 'pack_1usd'
                  : selectedPlanId === 'weekly_gold'
                  ? 'pack_5usd'
                  : selectedPlanId === 'monthly_silver'
                  ? 'pack_10usd'
                  : 'pack_100usd';

              return (
                <button
                  type="button"
                  disabled={purchasingPackId !== null}
                  onClick={() => handleQuickPurchase(targetPackId)}
                  className="w-full py-3.5 bg-[#1f1d1e] hover:bg-black text-white font-extrabold text-sm sm:text-base rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {purchasingPackId !== null ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={18} strokeWidth={2.2} />
                      <span>Unlock Full Report — {currentPriceText}</span>
                    </>
                  )}
                </button>
              );
            })()}

            {/* Footer Summary & Trust Badges */}
            <div className="text-center mt-3.5">
              <p className="text-xs font-bold text-[#1f1d1e] mb-1">
                Billed {selectedPlanId === 'weekly_silver' ? '$1.9 weekly' : selectedPlanId === 'weekly_gold' ? '$4.9 weekly' : selectedPlanId === 'monthly_silver' ? '$9.9 monthly' : '$99.9 monthly'}
              </p>
              <p className="text-[11px] text-[#8a8486] mb-2.5">
                Secure payment • Instant fulfillment • Credits never expire
              </p>
              <div className="text-xs text-[#8a8486]">
                Already have credits?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/sign-in')}
                  className="text-[#e05670] hover:underline font-semibold cursor-pointer"
                >
                  Log in
                </button>
              </div>
              <div className="flex items-center justify-center gap-3 text-[11px] text-[#8a8486] mt-3">
                <span className="cursor-pointer hover:underline">Terms of Service</span>
                <span>·</span>
                <span className="cursor-pointer hover:underline">Privacy Policy</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
