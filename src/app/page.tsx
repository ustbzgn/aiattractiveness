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
  ShieldCheck,
  Clock,
  Scale,
  UserCheck,
  TrendingUp,
  Eye,
  Smile,
  Sliders,
  ArrowUp,
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
    <div className="w-full">
      {/* Hero Header */}
      <section className="text-center mb-12 max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#f5d0d8] text-[#e05670] text-xs sm:text-sm font-semibold mb-4 shadow-xs">
          <ScanFace size={16} strokeWidth={2.2} />
          <span>Objective Portrait Guidance</span>
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.12] mb-5 text-[#1f1d1e] tracking-tight">
          {messages.hero.title}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-[#575254] max-w-2xl mx-auto leading-relaxed">
          {messages.hero.subtitle}
        </p>
      </section>

      {/* Main Centered Test Panel */}
      <section id="upload-section" className="card-panel max-w-4xl mx-auto p-6 sm:p-10 mb-20 relative overflow-hidden shadow-lg border-[#e8dcd0]/70">
        {/* Soft Warm Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#fdf2f4] via-[#fbf0f2] to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        {/* Three Tabs - Clean Photography Diagnostic Modes */}
        <div className="tabs-container mb-8 max-w-[560px] mx-auto">
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

      {/* Section 1: Real Assessment Reports Showcase (Example Gallery with Premium Visuals) */}
      <section className="mb-20 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf2f4] border border-[#f5d0d8] text-[#e05670] text-xs font-semibold mb-3">
            <Camera size={13} />
            <span>Editorial Sample Results</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1f1d1e] tracking-tight mb-3">
            Example Attractiveness & Portrait Compare Results
          </h2>
          <p className="text-base sm:text-lg text-[#575254] max-w-2xl mx-auto">
            See how our detailed portrait assessment visualizes key score differences, lighting harmony, and delivers clear comparative verdicts.
          </p>
        </div>

        {/* High-End Realistic Showcase Display Mockup */}
        <div className="card-panel p-4 sm:p-8 bg-gradient-to-b from-[#faf8f9] to-white border border-[#ebdada] shadow-xl rounded-3xl overflow-hidden mb-8">
          <div className="relative w-full rounded-2xl overflow-hidden border border-[#e8dcd0] shadow-md bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sample-previews/example-compare.png"
              alt="Example Attractiveness Test and Face Compare Reports"
              className="w-full h-auto object-cover block"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#f0e6e8]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] border border-[#f5d0d8] flex items-center justify-center text-[#e05670] shrink-0">
                <ScanFace size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1f1d1e]">Facial Symmetry & Traits</h4>
                <p className="text-xs text-[#8a8486]">Golden ratio proportion mapping</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] border border-[#f5d0d8] flex items-center justify-center text-[#e05670] shrink-0">
                <Sliders size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1f1d1e]">Lighting & Contrast</h4>
                <p className="text-xs text-[#8a8486]">Diffused studio lighting check</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fdf2f4] border border-[#f5d0d8] flex items-center justify-center text-[#e05670] shrink-0">
                <Trophy size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1f1d1e]">Winner Decision Verdict</h4>
                <p className="text-xs text-[#8a8486]">Side-by-side preference analysis</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Full-Bleed Luxury Photographic Banner ("What Does the Assessment Measure?") */}
      {/* 唯一全屏贯穿的底图 (100% Viewport Width Full-Bleed with dark warm gradient scrim) */}
      <section className="w-full relative overflow-hidden my-20 sm:my-28 py-20 sm:py-28 md:py-32 bg-[#1a1315]">
        {/* Background Photographic Image spanning 100% full-bleed */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sample-previews/measure-banner.png"
          alt="What Does the AI Attractiveness Test Measure"
          className="absolute inset-0 w-full h-full object-cover object-center block select-none pointer-events-none"
        />

        {/* Warm Dark Editorial Gradient Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/60 to-black/45" />

        {/* Centered Editorial Text Content - Restrained to max-w-2xl so text is not spread too wide and faces remain visible */}
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-5 sm:mb-6 leading-[1.15] drop-shadow-md">
            What Does the AI Attractiveness Test Measure?
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-white/95 leading-relaxed mb-5 font-normal drop-shadow">
            Most apps just guess a random number, but our comprehensive face analysis breaks your selfie down scientifically. First, we measure your <strong className="text-white font-semibold">Structural Traits</strong>—the undeniable genetics of your face. The algorithm acts as a precise golden ratio face test and face symmetry test, scoring your facial proportions and how perfectly balanced your features are from 1 to 10.
          </p>
          <p className="text-sm sm:text-base md:text-lg text-white/90 leading-relaxed mb-8 font-normal drop-shadow">
            Second, our portrait test evaluates your <strong className="text-white font-semibold">Perceived Vibe</strong>—the subjective, magnetic energy you project to others. It reads your micro-expressions to score your natural confidence, intelligence, and approachability. Finally, our system applies a smart, weighted calculation to all dimensions, delivering one highly accurate, comprehensive overall score out of 10.
          </p>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('upload-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="px-8 py-3.5 rounded-full bg-[#e05670] hover:bg-[#c43d56] text-white font-bold text-sm sm:text-base shadow-xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20"
          >
            Get Your Attractiveness Rating
          </button>
        </div>
      </section>

      {/* Section 3: Why We Offer the Best Test (Matching Competitor Clean 3-Card Card Layout) */}
      <section className="mb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1f1d1e] tracking-tight mb-4">
            Why We Offer the Best AI Attractiveness Test
          </h2>
          <p className="text-base sm:text-lg text-[#575254] max-w-2xl mx-auto leading-relaxed">
            Not all face raters are created equal. Discover why users trust our platform as the most secure, comprehensive, and accurate portrait assessment available today.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-10">
          {/* Card 1: Superior Accuracy */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <CheckCircle2 size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              Superior Accuracy.
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              Unlike generic chat bots, our specialized assessment model is purpose-built for highly detailed, photographic face analysis and golden ratio geometry.
            </p>
          </div>

          {/* Card 2: Instant Diagnostics */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <Clock size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              Instant & Transparent
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              No waiting. Simply upload your portrait and instantly receive a comprehensive baseline face rating and lighting breakdown in under 30 seconds.
            </p>
          </div>

          {/* Card 3: 100% Private & Ephemeral */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <ShieldCheck size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              100% Secure & Ephemeral
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              Your privacy is our highest priority. Uploaded photos are processed in volatile memory for your report and never permanently stored or repurposed.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('upload-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="px-8 py-3.5 rounded-full bg-[#e05670] hover:bg-[#c43d56] text-white font-bold text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Try the Best Attractiveness Rater
          </button>
        </div>
      </section>

      {/* Section 4: Photography Pro Tips ("How to Get an Accurate AI Attractiveness Score") */}
      <section className="mb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1f1d1e] tracking-tight mb-4">
            How to Get an Accurate AI Attractiveness Score (Pro Tips)
          </h2>
          <p className="text-base sm:text-lg text-[#575254] max-w-2xl mx-auto leading-relaxed">
            The best portrait assessment requires a high-quality upload. For the most accurate rating results, follow these four quick photography guidelines before scanning your face.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: High-Res Photography Collage Image */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border border-[#ebdada] shadow-xl bg-[#faf8f9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sample-previews/sample-portrait-1.png"
                alt="Pro Tips Photography Guidelines"
                className="w-full h-auto object-cover block"
              />
            </div>
          </div>

          {/* Right: 4 Editorial Bullet Points */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Use Natural Lighting:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Avoid harsh direct shadows and backlighting. Stand facing a soft window for even ambient light to ensure a precise facial symmetry test.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Keep Your Phone Level:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Avoid extreme high or low selfie angles. Hold your camera straight at eye level for a true, distortion-free portrait assessment.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Stay Natural & Relaxed:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Forced smiles tense up facial muscles. Keep your expression relaxed with subtle natural warmth for authentic facial analysis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Remove Obstructing Accessories:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  The analysis requires an unobstructed view of key landmarks. Take off dark sunglasses, hats, and push back hair to reveal your natural jawline and bone structure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Improvement Blueprint ("How to Improve Your AI Attractiveness Score") */}
      <section className="mb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1f1d1e] tracking-tight mb-4">
            How to Improve Your AI Attractiveness Score
          </h2>
          <p className="text-base sm:text-lg text-[#575254] max-w-2xl mx-auto leading-relaxed">
            Your beauty score test is just the starting point. While bone structure is unique, you can significantly boost your overall presence by optimizing the elements you can control.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center mb-10">
          {/* Left: 4 Improvement Pillars */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Invest in Skincare & Grooming:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Clear, hydrated skin reflects light evenly. A consistent daily routine highlights your natural features and boosts your real-world face rating.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Focus on Jawline Definition & Health:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Regular physical activity and balanced hydration reduce facial puffiness, revealing a sharper jawline and more defined bone structure.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Master Your Micro-Expression:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  A genuine micro-smile makes you instantly approachable. Strong, focused eye contact projects natural confidence and high charisma.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e05670] mt-2 shrink-0" />
              <div>
                <h4 className="text-base sm:text-lg font-bold text-[#1f1d1e] mb-1">
                  Refine Neck Angle & Head Posture:
                </h4>
                <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
                  Slouching dampens perceived confidence. Standing tall immediately improves your neck contour and projects commanding, magnetic presence.
                </p>
              </div>
            </div>
          </div>

          {/* Right: High-Res Lifestyle Photography Collage Image */}
          <div className="lg:col-span-6">
            <div className="relative rounded-3xl overflow-hidden border border-[#ebdada] shadow-xl bg-[#faf8f9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sample-previews/sample-portrait-2.png"
                alt="Improve Your Portrait Presence Blueprint"
                className="w-full h-auto object-cover block"
              />
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('upload-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="px-8 py-3.5 rounded-full bg-[#e05670] hover:bg-[#c43d56] text-white font-bold text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Improve Attractiveness Score
          </button>
        </div>
      </section>

      {/* Section 6: Why Take an AI Attractiveness Test? (3 High-Impact Cards) */}
      <section className="mb-24 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#1f1d1e] tracking-tight mb-4">
            Why Take an AI Attractiveness Test?
          </h2>
          <p className="text-base sm:text-lg text-[#575254] max-w-2xl mx-auto leading-relaxed">
            When you search for an attractiveness photo test, it is rarely just vanity. An accurate portrait assessment is a highly practical tool for self-awareness, social media optimization, and actionable personal improvement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-10">
          {/* Card 1: 100% Unbiased Opinion */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <Scale size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              Get a 100% Unbiased Opinion.
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              Friends and family are often too polite to be completely honest. Our portrait evaluation provides an objective assessment based on pure geometry and visual harmony, not flattery.
            </p>
          </div>

          {/* Card 2: Optimize Online Profiles */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <UserCheck size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              Optimize Your Online Profiles.
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              First impressions matter online. Use your portrait test results to scientifically select the most magnetic, high-converting photo for your dating apps or professional networks.
            </p>
          </div>

          {/* Card 3: Track Glow-Up Progress */}
          <div className="card-panel p-8 sm:p-10 rounded-3xl border border-[#f0e6e8] shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center bg-white">
            <div className="w-12 h-12 rounded-full border border-[#f5d0d8] bg-[#fdf2f4] flex items-center justify-center text-[#e05670] mb-6">
              <TrendingUp size={22} />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#1f1d1e] mb-3">
              Track Your &quot;Glow-Up&quot; Progress.
            </h3>
            <p className="text-sm sm:text-base text-[#575254] leading-relaxed">
              Changing hairstyle, starting a new skincare routine, or working out? Getting a baseline score allows you to tangibly track how those physical improvements increase your overall rating.
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('upload-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="px-8 py-3.5 rounded-full bg-[#e05670] hover:bg-[#c43d56] text-white font-bold text-sm sm:text-base shadow-md transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            Score Your Attractiveness
          </button>
        </div>
      </section>

      {/* Section 5: Bottom Call to Action Banner */}
      <section className="mb-14 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="card-panel p-7 sm:p-9 bg-gradient-to-r from-[#fdf2f4] via-[#fbf0f2] to-[#faf8f9] border border-[#f5d0d8] rounded-3xl text-center relative overflow-hidden">
          <div className="max-w-[540px] mx-auto relative z-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1f1d1e] tracking-tight mb-2.5">
              Ready to Discover Your Portrait Score?
            </h2>
            <p className="text-sm sm:text-base text-[#575254] mb-6 leading-relaxed">
              Upload your photo above to receive immediate photography ratings and personalized lighting recommendations.
            </p>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('upload-section');
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth' });
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#e05670] hover:bg-[#d04560] text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all transform active:scale-98 cursor-pointer"
            >
              <span>Analyze Your Portrait Now</span>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="mb-12 max-w-4xl mx-auto px-4 sm:px-6">
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
