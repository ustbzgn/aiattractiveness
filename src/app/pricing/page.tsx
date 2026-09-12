'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, ArrowRight, Award, Camera } from 'lucide-react';
import { CREDIT_PACKAGES } from '@/lib/config';
import { messages } from '@/lib/messages/en';

function PricingContent() {
  const searchParams = useSearchParams();
  const fromScan = searchParams.get('from') === 'scan';

  const [loadingPackId, setLoadingPackId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBuyPackage = async (packId: string) => {
    setLoadingPackId(packId);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/checkout/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Direct users cleanly to sign-in with redirect back to pricing
          window.location.href = '/sign-in?redirect=/pricing';
          return;
        } else {
          setErrorMessage(data.error || 'Failed to start checkout. Please try again.');
        }
        setLoadingPackId(null);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setErrorMessage('No checkout URL returned by payment gateway.');
        setLoadingPackId(null);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Network error initiating checkout'
      );
      setLoadingPackId(null);
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto w-full">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-3 text-[#24141b] tracking-tight">
          {messages.routes.pricing.title}
        </h1>
        <p className="text-base sm:text-lg text-[#5e4651] max-w-[600px] mx-auto leading-relaxed">
          {messages.routes.pricing.subtitle}
        </p>
      </div>

      {/* Sunk-Cost Hook: Portrait Diagnostic Ready Banner */}
      {fromScan && (
        <div className="card-panel p-5 sm:p-6 mb-8 max-w-4xl mx-auto border-[#f5d0d8] bg-[#faf8f9] shadow-xs flex items-start gap-4 animate-in fade-in duration-200">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#f0e6e8] text-[#e05670] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Camera size={20} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider font-bold text-[#e05670] bg-[#fdf2f4] border border-[#f5d0d8] px-2.5 py-0.5 rounded-full">
                Portrait Ready
              </span>
              <h3 className="text-base sm:text-lg font-bold text-[#1f1d1e]">
                Your portrait evaluation is compiled and ready to unlock!
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#575254] leading-relaxed">
              Choose a portrait credit package below to reveal your detailed scores and personalized suggestions. Credits never expire and can be used anytime.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert Display */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-[#fff1f2] border border-[#fecdd3] rounded-xl text-[#be123c] text-sm mb-8 max-w-4xl mx-auto flex items-center justify-between gap-4"
        >
          <span>{errorMessage}</span>
          {errorMessage.includes('sign in') && (
            <Link
              href="/sign-in?redirect=/pricing"
              className="inline-flex items-center gap-1 font-bold text-[#e05670] hover:text-[#c43d56] underline shrink-0"
            >
              <span>Go to Sign In</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Credit Package Cards Grid (Spacious 2x2 layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12 items-stretch">
        {CREDIT_PACKAGES.map((pkg) => {
          const isFeatured = !!pkg.badge;
          return (
            <div
              key={pkg.id}
              className={`card-panel p-6 sm:p-8 flex flex-col justify-between relative transition-all duration-200 ${
                isFeatured
                  ? 'border-[#e05670] ring-1 ring-[#e05670]/30 bg-white shadow-xl shadow-[#e05670]/5'
                  : 'hover:shadow-md'
              }`}
            >
              {isFeatured && (
                <div className="absolute -top-3.5 right-6 flex items-center gap-1 bg-[#e05670] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
                  <Award size={13} strokeWidth={2.5} />
                  <span>{pkg.badge}</span>
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold mb-1.5 text-[#1f1d1e]">
                  {pkg.name}
                </h3>
                <p className="text-sm text-[#575254] mb-6 leading-relaxed">
                  {pkg.description}
                </p>

                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl sm:text-5xl font-extrabold text-[#1f1d1e] tracking-tight">
                    ${pkg.priceUsd}
                  </span>
                  <span className="text-xs text-[#8a8486] font-medium uppercase tracking-wider">USD</span>
                </div>

                <div className="mb-6">
                  {pkg.bonusCredits ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-[#e05670]">
                        {pkg.totalCredits} Credits
                      </span>
                      <span className="text-xs bg-[#ecfdf5] text-[#059669] font-semibold px-2 py-0.5 rounded-full">
                        Includes {pkg.bonusCredits} Bonus
                      </span>
                    </div>
                  ) : (
                    <p className="text-base font-bold text-[#e05670]">
                      {pkg.credits} Credits
                    </p>
                  )}
                </div>

                <div className="border-t border-[#f0e6e8] pt-5 flex flex-col gap-2.5 mb-8">
                  {pkg.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm text-[#575254]">
                      <span className="w-4 h-4 rounded-full bg-[#fdf2f4] flex items-center justify-center shrink-0 text-[#e05670] mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      <span className="leading-snug">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className={`btn w-full h-11 text-sm font-bold ${
                  isFeatured ? 'btn-rose shadow-md shadow-[#e05670]/25' : 'btn-secondary'
                }`}
                disabled={loadingPackId === pkg.id}
                onClick={() => handleBuyPackage(pkg.id)}
              >
                {loadingPackId === pkg.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>{messages.routes.pricing.cta}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Credit Usage Breakdown / Mode Schedule */}
      <div className="card-panel p-6 sm:p-8 bg-[#faf8f9] border-[#f0e6e8] max-w-4xl mx-auto mb-10">
        <h4 className="text-base font-bold text-[#1f1d1e] mb-1.5 text-center sm:text-left">
          Credit Usage by Analysis Mode
        </h4>
        <p className="text-xs sm:text-sm text-[#575254] mb-6 text-center sm:text-left">
          Credits are only deducted upon successfully generated evaluations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-[#f0e6e8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-[#1f1d1e]">Fast Test</span>
              <span className="text-xs font-extrabold text-[#e05670] bg-[#fdf2f4] px-2 py-0.5 rounded-full">
                10 Credits
              </span>
            </div>
            <p className="text-xs text-[#575254] leading-relaxed">
              Rapid overview of face framing, key illumination, and overall photo sharpness.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#f0e6e8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-[#1f1d1e]">Deep Scan</span>
              <span className="text-xs font-extrabold text-[#e05670] bg-[#fdf2f4] px-2 py-0.5 rounded-full">
                40 Credits
              </span>
            </div>
            <p className="text-xs text-[#575254] leading-relaxed">
              In-depth facial lighting balance, expression nuance, composition ratio, and tips.
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#f0e6e8]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-[#1f1d1e]">Face Compare</span>
              <span className="text-xs font-extrabold text-[#e05670] bg-[#fdf2f4] px-2 py-0.5 rounded-full">
                50 Credits
              </span>
            </div>
            <p className="text-xs text-[#575254] leading-relaxed">
              Dual-portrait side-by-side comparison across angles, lighting, and expression.
            </p>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="text-[#e05670] hover:text-[#c43d56] text-sm underline font-medium transition-colors"
        >
          Return to portrait testing panel
        </Link>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center py-16">
          <Loader2 size={32} className="animate-spin text-[#e05670] mx-auto mb-4" />
          <p className="text-sm text-[#5e4651]">Loading credit packages...</p>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
