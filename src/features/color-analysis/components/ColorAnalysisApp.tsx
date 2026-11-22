'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Palette } from 'lucide-react';

const SEASONAL_SWATCHES = [
  { label: 'Spring', colors: ['#f6d6ad', '#f29e74', '#e86f68', '#89b98c'] },
  { label: 'Summer', colors: ['#e9d5de', '#c993a8', '#8fa8c8', '#7d8fa3'] },
  { label: 'Autumn', colors: ['#e6c29f', '#c77c4e', '#8e513a', '#5d6b4a'] },
  { label: 'Winter', colors: ['#f0eff4', '#b95068', '#2f4562', '#1f1d1e'] },
] as const;

export function ColorAnalysisApp() {
  return (
    <div className="max-w-[920px] mx-auto px-4 sm:px-6 py-14 sm:py-20">
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fdf2f4] border border-[#f5d0d8] text-[#e05670] text-xs font-semibold mb-4">
          <Palette size={13} />
          <span>Coming Soon</span>
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-extrabold text-[#1f1d1e] tracking-tight mb-4">
          Personal Color Analysis
        </h1>
        <p className="text-base sm:text-lg text-[#575254] max-w-xl mx-auto leading-relaxed">
          Discover your seasonal palette, undertone harmony, and flattering wardrobe shades from a single natural-light portrait.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {SEASONAL_SWATCHES.map((season) => (
          <div
            key={season.label}
            className="card-panel p-5 bg-white border border-[#f0e6e8] text-center"
          >
            <div className="flex items-center justify-center gap-1.5 mb-3">
              {season.colors.map((hex) => (
                <span
                  key={hex}
                  className="w-6 h-6 rounded-full border border-black/10"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <span className="font-serif text-base font-bold text-[#1f1d1e]">
              {season.label}
            </span>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link
          href="/attractiveness-test"
          className="btn btn-rose py-3 px-7 shadow-md shadow-[#e05670]/25"
        >
          <span>Try Attractiveness Test Now</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
