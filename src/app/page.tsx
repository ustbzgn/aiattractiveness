import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Camera, Palette } from 'lucide-react';
import { APP_CONFIG } from '@/lib/config';
import { PORTAL_APPS } from '@/core/registry';

export const metadata: Metadata = {
  title: `${APP_CONFIG.appName} - Portrait & Personal Color Studio`,
  description:
    'Editorial portrait diagnostics, lighting feedback, side-by-side comparisons, and seasonal color analysis with shared studio credits.',
  alternates: {
    canonical: '/',
  },
};

export default function PortalHomePage() {
  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 py-14 sm:py-20">
      {/* Portal Hero */}
      <section className="text-center max-w-2xl mx-auto mb-14 sm:mb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e05670] mb-3">
          {APP_CONFIG.appName} Studio
        </p>
        <h1 className="font-serif text-4xl sm:text-5xl md:text-[54px] font-extrabold text-[#1f1d1e] tracking-tight leading-[1.1] mb-4">
          Personal Portrait &amp; Color Diagnostics
        </h1>
        <p className="text-base sm:text-lg text-[#575254] leading-relaxed">
          One studio account and shared credit balance across every visual analysis tool.
        </p>
      </section>

      {/* Studio Apps Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        {PORTAL_APPS.map((app) => {
          const isLive = app.status === 'live';
          return (
            <Link
              key={app.id}
              href={app.href}
              className="group card-panel overflow-hidden flex flex-col justify-between bg-white border border-[#f0e6e8] hover:border-[#e05670]/50 transition-all"
            >
              {/* Visual Preview Area */}
              <div className="relative h-60 sm:h-64 bg-[#faf8f9] border-b border-[#f0e6e8] overflow-hidden flex items-center justify-center">
                {app.previewImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={app.previewImage}
                    alt={app.name}
                    className="w-full h-full object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-4 px-6">
                    <div className="w-12 h-12 rounded-2xl bg-[#fdf2f4] border border-[#f5d0d8] text-[#e05670] flex items-center justify-center">
                      <Palette size={24} />
                    </div>
                    {app.accentSwatches && (
                      <div className="flex items-center gap-2.5">
                        {app.accentSwatches.map((hex) => (
                          <span
                            key={hex}
                            className="w-8 h-8 rounded-full border border-black/10 shadow-xs"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <span
                  className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                    isLive
                      ? 'bg-white/95 text-[#e05670] border-[#f5d0d8]'
                      : 'bg-white/95 text-[#575254] border-[#e2d3d6]'
                  }`}
                >
                  {isLive ? 'Available' : 'Coming Soon'}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-6 sm:p-7 flex flex-col flex-1 justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-[#e05670]">
                    {app.id === 'attractiveness' ? <Camera size={16} /> : <Palette size={16} />}
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {app.href}
                    </span>
                  </div>
                  <h2 className="font-serif text-2xl font-bold text-[#1f1d1e] mb-2 group-hover:text-[#e05670] transition-colors">
                    {app.name}
                  </h2>
                  <p className="text-sm text-[#575254] leading-relaxed mb-6">
                    {app.tagline}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 text-sm font-bold text-[#e05670]">
                  <span>{isLive ? 'Open Studio' : 'Preview'}</span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
