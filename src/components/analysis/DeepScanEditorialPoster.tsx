'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './DeepScanEditorialPoster.module.css';
import {
  Camera,
  Award,
  Scale,
  Leaf,
  ScanFace,
} from 'lucide-react';
import { DeepScanReport } from '@/lib/types/deep-scan';

interface DeepScanEditorialPosterProps {
  report: DeepScanReport;
  /**
   * 'fixed-1200' is the 1200px-wide editorial layout with content-driven height for PNG export.
   * 'responsive' is the responsive layout that adapts to screens.
   */
  variant?: 'fixed-1200' | 'responsive';
  className?: string;
  id?: string;
}

export function DeepScanEditorialPoster({
  report,
  variant = 'responsive',
  className = '',
  id,
}: DeepScanEditorialPosterProps) {
  const isFixed = variant === 'fixed-1200';
  const gridRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [leaders, setLeaders] = useState<Array<{ id: string; path: string; x: number; y: number; endX: number; endY: number }>>([]);

  useEffect(() => {
    const grid = gridRef.current;
    const portrait = portraitRef.current;
    const image = imageRef.current;
    if (!grid || !portrait || !image) { setLeaders([]); return; }
    const update = () => {
      const bounds = grid.getBoundingClientRect();
      const photo = portrait.getBoundingClientRect();
      if (!image.naturalWidth || !image.naturalHeight) return;
      // Match the displayed object-cover image, including cropped edge offsets.
      const scale = Math.max(photo.width / image.naturalWidth, photo.height / image.naturalHeight);
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      const next: typeof leaders = [];
      report.metrics.forEach((metric) => {
        const row = rowRefs.current[metric.id];
        const box = report.rawNormalizedBoxes?.[metric.cropKey];
        if (!row || !box) return;
        const target = row.getBoundingClientRect();
        // Stacked mobile layout has no cross-column leaders.
        if (target.left < photo.right) return;
        const anchorX = box.x + box.width * (metric.cropKey === 'face' ? .8 : .65);
        const anchorY = box.y + box.height * (metric.id === 'facial_symmetry' ? .25 : .55);
        const localX = anchorX * width - (width - photo.width) / 2;
        const localY = anchorY * height - (height - photo.height) / 2;
        if (localX < 0 || localX > photo.width || localY < 0 || localY > photo.height) return;
        const x = photo.left - bounds.left + localX;
        const y = photo.top - bounds.top + localY;
        const endX = target.left - bounds.left;
        const endY = target.top - bounds.top + target.height / 2;
        const elbowX = endX - 24;
        next.push({ id: metric.id, x, y, endX, endY,
          path: `M ${x} ${y} L ${elbowX - 12} ${endY} Q ${elbowX} ${endY} ${elbowX + 6} ${endY} L ${endX} ${endY}` });
      });
      setLeaders(next);
    };
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    observer.observe(portrait);
    Object.values(rowRefs.current).forEach(row => { if (row) observer.observe(row); });
    image.addEventListener('load', update);
    update();
    return () => { observer.disconnect(); image.removeEventListener('load', update); };
  }, [report, variant]);


  const palette = report.palette || {
    skinTone: ['#f7e1d7', '#eecaba', '#dcb59c', '#b88667', '#915d3e'],
    eyeColor: ['#d7cac1', '#a27954', '#6e4f35', '#4b3524', '#2e1e16'],
    hairColor: ['#9a7b63', '#583e2b', '#342017', '#1a0f0a'],
  };

  const avgPercentage = report.averagePercentage || Math.round(report.overallScore * 10);
  const scoreDisplay = report.overallScore.toFixed(2);

  // 5-point star for rating
  const FivePointStar = ({ size = 18 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#b95068"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );

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
            <path d="M9 2c0 6-1.5 9-4 13-1.7 3 .2 6 3 5M15 2c0 6 1.5 9 4 13 1.7 3-.2 6-3 5" />
            <path d="M7 18c1-2 3-1 3 1 0 2 4 2 4 0 0-2 2-3 3-1" />
          </svg>
        );
      case 'lips':
        return (
          <svg className="w-5 h-5 text-[#b95068]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2 12c3-2 5-6 8-5l2 1 2-1c3-1 5 3 8 5-3 2-5 7-10 7S5 14 2 12Z" />
            <path d="M2 12c4-1 7-1 10 0 3-1 6-1 10 0M7 14c3 1 7 1 10 0" />
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

  return (
    <div
      id={id}
      style={isFixed ? { width: '1200px', minWidth: '1200px', maxWidth: '1200px', boxSizing: 'border-box' } : undefined}
      className={`${styles.poster} ${isFixed ? styles.fixed : styles.responsive} relative bg-[#fcf9f6] text-[#2c2627] rounded-3xl border border-[#ded5cb] shadow-xl overflow-hidden font-sans ${
        isFixed ? 'p-12' : 'p-6 sm:p-10'
      } ${className}`}
    >
      {/* Subtle Luxury Linen Poster Inner Border Ring */}
      <div
        className={`${styles.innerBorder} pointer-events-none absolute rounded-2xl border border-[#ded5cb]/70 ${
          isFixed ? 'inset-3.5' : 'inset-2.5 sm:inset-3'
        }`}
      />

      {/* 1. Header Bar */}
      <div className={`${styles.header} relative z-10 flex items-start justify-between border-b border-[#e2d7cc] pb-5 mb-7`}>
        <div>
          <h1
            className={`${styles.title} font-serif font-black tracking-wider text-[#1e191a] uppercase leading-none ${
              isFixed ? 'text-[44px]' : 'text-3xl sm:text-4xl md:text-[42px]'
            }`}
          >
            Attractiveness Test
          </h1>
          <p
            className={`${styles.subtitle} font-semibold tracking-[0.2em] text-[#786c6e] uppercase mt-2 ${
              isFixed ? 'text-xs' : 'text-[11px] sm:text-xs'
            }`}
          >
            AI-Powered Facial Beauty Analysis
          </p>
        </div>

        <div className={`${styles.headerLabel} text-right flex items-center gap-3`}>
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#362f31]">
              Comprehensive
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#827678]">
              Facial Analysis
            </span>
          </div>
          <ScanFace size={26} strokeWidth={1} className={styles.seal} />
        </div>
      </div>

      {/* 2. Main Dual Column Grid: Left Portrait with Pins & Swatches | Right Feature Analysis Cards */}
      <div
        ref={gridRef}
        className={`${styles.mainGrid} relative z-10 gap-7 mb-8 items-stretch ${
          isFixed ? 'grid grid-cols-12' : 'grid grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* LEFT: Portrait Hero Card with Golden Ratio Overlays & Color Palettes */}
        <div
          className={`${styles.portraitPanel} ${
            isFixed ? 'col-span-6' : 'lg:col-span-6'
          } flex flex-col bg-white rounded-2xl border border-[#e6ded7] shadow-sm ${
            isFixed ? 'p-4' : 'p-3 sm:p-4'
          }`}
        >
          {/* Master Portrait Image Viewport with Landmark Points & Connecting Lines */}
          <div ref={portraitRef} className={`${styles.portrait} relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#f4eee8]`}>
            {report.originalImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageRef}
                src={report.originalImageUrl}
                alt="Portrait Master Analysis"
                className="w-full h-full object-cover block"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-[#a89d9e] p-6 text-center">
                <ScanFace className="w-16 h-16 mb-3 opacity-40 text-[#b95068]" />
                <p className="text-xs font-medium">Standardized Portrait Evaluation Master</p>
              </div>
            )}

            {/* Vertical Facial Symmetry Center Line */}
            <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/80 shadow-sm" />


          </div>

          {/* Bottom Color Palette Bar (Skin Tone, Eye Color, Hair Color) */}
          <div className={`${styles.palette} mt-4 pt-3 border-t border-[#f0e8e2] grid grid-cols-3 gap-2 text-center`}>
            {/* Skin Tone */}
            <div>
              <span className="block text-[10px] font-extrabold tracking-wider text-[#736769] uppercase mb-1.5">
                Skin Tone
              </span>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {palette.skinTone.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: color }}
                    title={`Skin Tone: ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Eye Color */}
            <div className="border-x border-[#f0e8e2] px-1">
              <span className="block text-[10px] font-extrabold tracking-wider text-[#736769] uppercase mb-1.5">
                Eye Color
              </span>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {palette.eyeColor.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: color }}
                    title={`Eye Color: ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <span className="block text-[10px] font-extrabold tracking-wider text-[#736769] uppercase mb-1.5">
                Hair Color
              </span>
              <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                {palette.hairColor.map((color, idx) => (
                  <span
                    key={idx}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border border-black/10 shadow-2xs shrink-0"
                    style={{ backgroundColor: color }}
                    title={`Hair Color: ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Feature Analysis Bento Section (6 Dimension Cards with Real Physical Crops) */}
        <div
          className={`${styles.featurePanel} ${
            isFixed ? 'col-span-6' : 'lg:col-span-6'
          } flex flex-col bg-white rounded-2xl border border-[#e6ded7] shadow-sm ${
            isFixed ? 'p-5' : 'p-4 sm:p-5'
          }`}
        >
          <h2 className={styles.sectionTitle}>
            Feature Analysis
          </h2>

          <div className={styles.featureList}>
            {report.metrics.map((metric) => {
              const cropSrc = report.crops[metric.cropKey];
              const pct = metric.percentageScore || Math.round((metric.score || 8.0) * 10);

              return (
                <div
                  key={metric.id}
                  ref={(node) => { rowRefs.current[metric.id] = node; }}
                  className={styles.featureRow}
                >
                  {/* Left Icon */}
                  <div className={styles.featureIcon}>
                    {renderMetricIcon(metric.id)}
                  </div>

                  {/* Middle Details & Progress Bar */}
                  <div className={styles.featureCopy}>
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <h3 className={styles.featureName}>
                        {metric.name}
                      </h3>
                      <span className={styles.featurePercent}>
                        {pct}%
                      </span>
                    </div>

                    <p className={styles.observation} title={metric.observation}>
                      {metric.observation}
                    </p>

                    {/* Percentage Bar in French Dusty Rose */}
                    <div className="w-full h-1.5 sm:h-2 bg-[#f2eae4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#d97c92] to-[#b95068] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Right Cropped Photo Box */}
                  <div className={styles.crop}>
                    {cropSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cropSrc}
                        alt={metric.name}
                        className="w-full h-full object-cover block"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#b8adae]">
                        <ScanFace className="w-5 h-5 opacity-50" />
                      </div>
                    )}

                    {/* Decorative Overlays (e.g. Center symmetry line for Symmetry, Grid for Proportions) */}
                    {metric.id === 'facial_symmetry' && (
                      <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-px border-l border-dashed border-white/90" />
                    )}
                    {metric.id === 'proportions' && (
                      <div className="pointer-events-none absolute inset-0 border border-white/50 grid grid-cols-2 grid-rows-2" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <svg className={styles.leaders} aria-hidden="true">
          {leaders.map(line => (
            <g key={line.id}>
              <path d={line.path} fill="none" stroke="#9a7a7c" strokeOpacity=".3" strokeWidth="2.5" />
              <path d={line.path} fill="none" stroke="#fffaf5" strokeWidth="1.5" strokeDasharray="2 4" strokeLinecap="round" />
              <circle cx={line.x} cy={line.y} r="3.5" fill="#fffaf5" />
              <circle cx={line.endX} cy={line.endY} r="3.5" fill="#b95068" />
            </g>
          ))}
        </svg>
      </div>

      {/* 3. Lower Grid: Overall Score Card (Left) & Facial Feature Harmony Donut Section (Right) */}
      <div
        className={`${styles.summaryGrid} relative z-10 gap-7 items-stretch ${
          isFixed ? 'grid grid-cols-12' : 'grid grid-cols-1 lg:grid-cols-12'
        }`}
      >
        {/* BOTTOM LEFT: Overall Attractiveness Score Card */}
        <div
          className={`${styles.scorePanel} ${
            isFixed ? 'col-span-5' : 'lg:col-span-5'
          } bg-white rounded-2xl border border-[#e6ded7] flex flex-col items-center justify-center text-center shadow-sm ${
            isFixed ? 'p-7' : 'p-6 sm:p-7'
          }`}
        >
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#6b5f61] mb-2">
            Overall Attractiveness Score
          </span>

          {/* Giant Display Typography */}
          <div className="flex items-baseline justify-center gap-1 my-1">
            <span
              className={`${styles.score} font-serif font-black text-[#8e374d] tracking-tight leading-none ${
                isFixed ? 'text-[68px]' : 'text-5xl sm:text-6xl md:text-[64px]'
              }`}
            >
              {scoreDisplay}
            </span>
            <span className="font-serif text-2xl sm:text-3xl font-normal text-[#9e9092]">
              / 10
            </span>
          </div>

          {/* 5 Stars Rating in Rose Dust */}
          <div className="flex items-center gap-1.5 my-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <FivePointStar key={i} size={isFixed ? 20 : 18} />
            ))}
          </div>

          {/* Confidence Level Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#f4ebe6] border border-[#e8ded6] text-[11px] font-extrabold uppercase tracking-wider text-[#453c3d] mb-3">
            <span>Confidence Level: High</span>
          </div>

          <p className="text-xs text-[#786c6e] max-w-xs leading-relaxed font-medium">
            Score reflects overall facial harmony, symmetry, proportions, and feature balance.
          </p>
        </div>

        {/* BOTTOM RIGHT: Facial Feature Harmony Donut & Tag Row */}
        <div
          className={`${styles.harmonyPanel} ${
            isFixed ? 'col-span-7' : 'lg:col-span-7'
          } bg-white rounded-2xl border border-[#e6ded7] flex flex-col justify-between shadow-sm ${
            isFixed ? 'p-7' : 'p-6 sm:p-7'
          }`}
        >
          <span className="text-center text-xs font-black uppercase tracking-[0.22em] text-[#4d4446] mb-5">
            Facial Feature Harmony
          </span>

          {/* Donut Gauge & 6 Metric Horizontal Bars */}
          <div className={styles.harmonyBody}>
            {/* Circular Gauge */}
            <div
              className={`${styles.gauge} relative shrink-0 flex items-center justify-center ${
                isFixed ? 'w-36 h-36' : 'w-32 h-32'
              }`}
            >
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#f4eae4"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="transparent"
                  stroke="#b95068"
                  strokeWidth="10"
                  strokeDasharray={251.2}
                  strokeDashoffset={251.2 * (1 - avgPercentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#7e7173] leading-tight mb-0.5">
                  Average<br />Feature Score
                </span>
                <span className="text-2xl font-black text-[#261f21] leading-none tracking-tight">
                  {avgPercentage}%
                </span>
              </div>
            </div>

            {/* 6 Clean Metric Bars */}
            <div className={styles.harmonyBars}>
              {report.metrics.map((m) => {
                const val = m.percentageScore || Math.round((m.score || 8.0) * 10);
                const displayName = m.name.toLowerCase().includes('symmetry')
                  ? 'Facial Symmetry'
                  : m.name.toLowerCase().includes('proportions')
                  ? 'Proportions'
                  : m.name.toLowerCase().includes('eyes')
                  ? 'Eyes'
                  : m.name.toLowerCase().includes('nose')
                  ? 'Nose'
                  : m.name.toLowerCase().includes('lips')
                  ? 'Lips'
                  : 'Jawline & Face Shape';

                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="w-32 font-bold text-[#42393b] truncate">{displayName}</span>
                    <div className="flex-1 h-2 bg-[#f4eae4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#b95068] rounded-full"
                        style={{ width: `${val}%` }}
                      />
                    </div>
                    <span className="w-8 text-right font-black text-[#261f21]">{val}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4 Pill Badges at the bottom: Balanced, Harmonious, Natural, Photogenic */}
          <div className={styles.badges}>
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#faf7f4] border border-[#ece4dc] text-[11px] font-black uppercase text-[#473d3f]">
              <Scale size={14} className="text-[#b95068]" />
              <span>Balanced</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#faf7f4] border border-[#ece4dc] text-[11px] font-black uppercase text-[#473d3f]">
              <Award size={14} className="text-[#b95068]" />
              <span>Harmonious</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#faf7f4] border border-[#ece4dc] text-[11px] font-black uppercase text-[#473d3f]">
              <Leaf size={14} className="text-[#b95068]" />
              <span>Natural</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-[#faf7f4] border border-[#ece4dc] text-[11px] font-black uppercase text-[#473d3f]">
              <Camera size={14} className="text-[#b95068]" />
              <span>Photogenic</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Elegant Footer */}
      <div className={styles.footer}>
        <div>
          <span className="block text-[#473e40]">Natural Beauty</span>
          <span className="text-[10px] text-[#9c8f91]">A Brighter You</span>
        </div>

        <div className="text-center font-bold text-[#b95068] tracking-[0.25em]">
          Beauty in Balance
        </div>

        <div className="flex items-center gap-1.5">
          <span>Analysis by AIAttractivenessTest.ai</span>
          
        </div>
      </div>
    </div>
  );
}
