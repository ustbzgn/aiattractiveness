'use client';

import { useState } from 'react';
import { Download, ExternalLink } from 'lucide-react';
import { downloadBlob } from '@/lib/export/report-exporter';

export function GeneratedDeepScanReport({ imageUrl, onReset }: { imageUrl: string; onReset?: () => void }) {
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
      downloadBlob(blob, `DeepScan-Report-${Date.now()}.${extension}`);
    } catch {
      setError('Download unavailable here. Open the original image to save it.');
    } finally {
      setDownloading(false);
    }
  }
  return (
    <section className="w-full max-w-[1000px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">Your personal portrait report</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#b95068]">
            <ExternalLink size={16} /> Open original
          </a>
          <button type="button" onClick={download} disabled={downloading} className="inline-flex items-center gap-2 rounded-full bg-[#b95068] px-5 py-2.5 text-sm text-white disabled:opacity-50">
            <Download size={16} /> {downloading ? 'Downloading…' : 'Download report'}
          </button>
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      {imageFailed && <p role="alert" className="text-sm text-rose-700">The report image could not be loaded. Try opening the original image.</p>}
      {/* The provider-generated image is the report; do not rebuild it as HTML. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="Your personalized facial analysis report" onError={() => setImageFailed(true)} onLoad={() => setImageFailed(false)} className="block w-full h-auto rounded-lg" />
      {onReset && <button type="button" onClick={onReset} className="text-sm text-[#b95068] underline underline-offset-4">Analyze another portrait</button>}
    </section>
  );
}
