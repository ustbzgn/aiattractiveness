'use client';

import { useState } from 'react';
import { Download, ExternalLink, Trophy, Award, CheckCircle2 } from 'lucide-react';
import { downloadBlob } from '@/lib/export/report-exporter';
import type { PortraitComparisonResult } from '@/lib/ai/deepseek';

export function GeneratedCompareReport({
  imageUrl,
  comparison,
  onReset,
}: {
  imageUrl: string;
  comparison?: PortraitComparisonResult;
  onReset?: () => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  async function download() {
    setDownloading(true);
    setError('');
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Image download failed');
      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Invalid image response');
      const extension = blob.type.includes('jpeg') ? 'jpg' : blob.type.includes('webp') ? 'webp' : 'png';
      downloadBlob(blob, `PortraitCompare-Poster-${Date.now()}.${extension}`);
    } catch {
      setError('Download unavailable here. Open the original image to save it.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="w-full max-w-[1000px] mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-[#ebdada] shadow-xs">
        <div className="flex items-center gap-2 text-stone-700 text-sm font-semibold">
          <Trophy className="w-4 h-4 text-[#b95068]" />
          <span>Portrait Battle & Comparison Poster</span>
          {comparison?.winner && (
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#fdf2f4] text-[#b95068] border border-[#f5d0d8]">
              {comparison.winner} Winner
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            <ExternalLink size={14} /> Open original
          </a>
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#b95068] hover:bg-[#a04056] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} /> {downloading ? 'Downloading…' : 'Download Poster (PNG)'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">{error}</p>}
      {imageFailed && (
        <p role="alert" className="text-sm text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
          The comparison poster image could not be loaded. Please try opening the original image.
        </p>
      )}

      {/* Main Poster Image Display */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Side-by-side portrait comparison editorial poster"
        onError={() => setImageFailed(true)}
        onLoad={() => setImageFailed(false)}
        className="block w-full h-auto rounded-2xl border border-[#ded5cb] shadow-lg"
      />

      {/* Structured Evaluation Summary */}
      {comparison && (
        <div className="card-panel p-6 sm:p-8 bg-white border-[#ebdada] rounded-2xl shadow-xs space-y-6">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-base pb-3 border-b border-[#f0e8e2]">
            <Award className="w-5 h-5 text-[#b95068]" />
            <span>Studio Editorial Verdict</span>
          </div>

          <div className="p-4 rounded-xl bg-[#faf7f4] border border-[#eee4dc] text-sm text-[#4a3f41] leading-relaxed">
            <p className="font-semibold text-[#1e191a] mb-1">Recommendation:</p>
            <p>{comparison.verdictRecommendation || comparison.overallAssessment}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white border border-[#eee4dc]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-[#1e191a]">Photo A (Baseline)</span>
                <span className="text-sm font-extrabold text-[#b95068]">{comparison.photoA.score}</span>
              </div>
              <ul className="space-y-1 text-xs text-[#575254]">
                {comparison.photoA.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#eee4dc]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-[#1e191a]">Photo B (Alternative)</span>
                <span className="text-sm font-extrabold text-[#b95068]">{comparison.photoB.score}</span>
              </div>
              <ul className="space-y-1 text-xs text-[#575254]">
                {comparison.photoB.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reset button */}
      {onReset && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onReset}
            className="text-sm text-[#b95068] hover:text-[#9e3a51] underline underline-offset-4 cursor-pointer font-medium"
          >
            Compare another pair of portraits
          </button>
        </div>
      )}
    </section>
  );
}
