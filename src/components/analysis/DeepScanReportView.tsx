'use client';

import React, { useState, useRef } from 'react';
import {
  ScanFace,
  Download,
  Share2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';
import { DeepScanReport, DEEP_SCAN_FIXTURES } from '@/lib/types/deep-scan';
import {
  exportFullDeepScanReportPng,
  exportShareCardPng,
  downloadBlob,
} from '@/lib/export/report-exporter';
import { GeneratedDeepScanReport } from './GeneratedDeepScanReport';
import { DeepScanEditorialPoster } from '@/components/analysis/DeepScanEditorialPoster';

interface DeepScanReportViewProps {
  report: DeepScanReport;
  onReset?: () => void;
  isDevPreview?: boolean;
  onSelectFixture?: (fixture: DeepScanReport) => void;
}

export function DeepScanReportView({
  report: initialReport,
  onReset,
  isDevPreview = false,
  onSelectFixture,
}: DeepScanReportViewProps) {
  const [report, setReport] = useState<DeepScanReport>(initialReport);
  const [showScoreOnShare, setShowScoreOnShare] = useState(true);
  const [isExportingFull, setIsExportingFull] = useState(false);
  const [isExportingShare, setIsExportingShare] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleDownloadFull = async () => {
    setIsExportingFull(true);
    setExportError(null);
    try {
      const blob = await exportFullDeepScanReportPng(report);
      downloadBlob(blob, `DeepScan-Poster-${Date.now()}.png`);
    } catch (err) {
      console.error('Full export failed:', err);
      setExportError('Failed to generate full report poster. Please try again.');
    } finally {
      setIsExportingFull(false);
    }
  };

  const handleDownloadShare = async () => {
    setIsExportingShare(true);
    setExportError(null);
    try {
      const blob = await exportShareCardPng(report, showScoreOnShare);
      downloadBlob(blob, `DeepScan-ShareCard-${Date.now()}.png`);
    } catch (err) {
      console.error('Share card export failed:', err);
      setExportError('Failed to generate share card. Please try again.');
    } finally {
      setIsExportingShare(false);
    }
  };

  const handleFixtureChange = (key: keyof typeof DEEP_SCAN_FIXTURES) => {
    const fixture = DEEP_SCAN_FIXTURES[key];
    setReport(fixture);
    onSelectFixture?.(fixture);
  };

  if (initialReport.generatedPoster) {
    return <GeneratedDeepScanReport imageUrl={initialReport.generatedPoster.imageUrl} onReset={onReset} />;
  }

  // If image fell below analysis threshold
  if (!report.isAnalyzable) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 md:p-10 bg-white rounded-3xl border border-[#f5d0d8] shadow-sm text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#fdf2f4] flex items-center justify-center text-[#b95068]">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-3">Analysis Cannot Be Completed</h2>
        <p className="text-stone-600 max-w-lg mx-auto mb-6 text-sm md:text-base leading-relaxed">
          {report.unusableReason ||
            'The uploaded image is blurry, heavily occluded, or does not clearly display a single frontal portrait.'}
        </p>

        <div className="bg-[#fcfbfa] border border-stone-200 rounded-2xl p-6 text-left max-w-xl mx-auto mb-8">
          <h3 className="font-semibold text-stone-800 text-sm mb-3">Recommended Steps:</h3>
          <ul className="space-y-2 text-xs md:text-sm text-stone-600">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#b95068] shrink-0 mt-0.5" />
                <span>
                  <strong>{rec.title}:</strong> {rec.action}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 border-t border-stone-200 text-xs text-stone-500">
            * Your 40 credits have been safely refunded to your account.
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="px-6 py-3 bg-[#b95068] hover:bg-[#a04056] text-white font-medium rounded-full transition-colors shadow-sm text-sm cursor-pointer"
          >
            Upload Another Portrait
          </button>
        )}
      </div>
    );
  }

  // Feature icon mapping
  const renderMetricIcon = (id: string) => {
    switch (id) {
      case 'facial_symmetry':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 3v18" strokeDasharray="2 2" />
            <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8z" />
          </svg>
        );
      case 'proportions':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3v18" />
            <circle cx="12" cy="12" r="4.5" />
          </svg>
        );
      case 'eyes':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        );
      case 'nose':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M12 4v11c0 1.2-1 2-2 2s-2-.8-2-2" />
            <path d="M10 17c1 1 3 1 4 0 1 1 3 1 4 0" />
          </svg>
        );
      case 'lips':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M4 12c2.5-3 5.5-2 8-1 2.5-1 5.5-2 8 1-2.5 4-5 5-8 5s-5.5-1-8-5Z" />
            <path d="M7 12c2.5 1 4 1.5 5 1.5s2.5-.5 5-1.5" />
          </svg>
        );
      case 'jawline_face_shape':
      default:
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M6 8c0-3.3 2.7-6 6-6s6 2.7 6 6c0 4-2.5 8-6 11-3.5-3-6-7-6-11Z" />
            <path d="M9 19v2h6v-2" />
          </svg>
        );
    }
  };

  const palette = report.palette || {
    skinTone: ['#f7e1d7', '#eecaba', '#dcb59c', '#b88667', '#915d3e'],
    eyeColor: ['#d7cac1', '#a27954', '#6e4f35', '#4b3524', '#2e1e16'],
    hairColor: ['#9a7b63', '#583e2b', '#342017', '#1a0f0a'],
  };

  const avgPercentage = report.averagePercentage || Math.round(report.overallScore * 10);
  const scoreDisplay = report.overallScore.toFixed(2);

  return (
    <div className="w-full max-w-[1000px] mx-auto space-y-6 font-sans">
      {/* Dev / Acceptance Preview Fixture Switcher */}
      {isDevPreview && (
        <div className="bg-[#fdf2f4] border border-[#f5d0d8] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#8e374d] font-semibold">
            <ScanFace className="w-4 h-4" />
            <span>Dev / Testing Fixture Preview Mode:</span>
          </div>
          <div className="flex items-center gap-2">
            {(['normal', 'longText', 'partialMissing', 'unanalyzable'] as const).map((key) => (
              <button
                key={key}
                onClick={() => handleFixtureChange(key)}
                className="px-3 py-1.5 rounded-lg border border-[#f5d0d8] bg-white text-stone-700 hover:bg-[#b95068] hover:text-white transition-colors capitalize font-medium cursor-pointer"
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action Bar (Download & Social Share) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#ebdada] shadow-xs">
        <div className="flex items-center gap-2 text-stone-700 text-sm font-semibold">
          <ScanFace className="w-4 h-4 text-[#b95068]" />
          <span>High-Resolution Editorial Poster Result</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScoreOnShare(!showScoreOnShare)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-medium transition-colors cursor-pointer"
            title="Toggle whether score is visible on social share card"
          >
            {showScoreOnShare ? (
              <>
                <Eye className="w-3.5 h-3.5 text-[#b95068]" />
                <span>Score Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                <span>Score Hidden</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadShare}
            disabled={isExportingShare}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#f5d0d8] bg-[#fdf2f4] text-[#b95068] hover:bg-[#fae4e9] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isExportingShare ? 'Generating...' : 'Share Card (4:5)'}</span>
          </button>

          <button
            onClick={handleDownloadFull}
            disabled={isExportingFull}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#b95068] hover:bg-[#a04056] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExportingFull ? 'Exporting...' : 'Download Poster (PNG)'}</span>
          </button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
          {exportError}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDITORIAL POSTER - 1:1 REPLICATION OF imgs/analysis.png                   */}
      {/* Single source of truth for both display and HTML-to-PNG export             */}
      {/* ========================================================================= */}
      <DeepScanEditorialPoster report={report} variant="responsive" />

      {/* Hidden 1200px Fixed HTML Node for Pristine 1:1 Ultra-HD PNG Export */}
      <div
        style={{
          position: 'fixed',
          left: '-99999px',
          top: 0,
          width: '1200px',
          pointerEvents: 'none',
          zIndex: -9999,
        }}
        aria-hidden="true"
      >
        <DeepScanEditorialPoster
          id="deep-scan-poster-export-node"
          report={report}
          variant="fixed-1200"
        />
      </div>
    </div>
  );
}
