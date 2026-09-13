/**
 * High-Resolution HTML DOM to PNG Exporter for Deep Scan Reports
 *
 * Replaces old manual Canvas drawing with direct HTML-to-Image rasterization.
 * 100% "What You See Is What You Get" matching the editorial layout in imgs/analysis.png.
 */

import { toBlob } from 'html-to-image';
import { DeepScanReport } from '@/lib/types/deep-scan';

/**
 * Preloads and decodes all images and fonts within an HTML element before capturing
 */
async function prepareElementForCapture(element: HTMLElement): Promise<void> {
  // Wait for web fonts (e.g., Playfair Display) to load
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading wait failed or timed out:', e);
    }
  }

  // Ensure all <img> tags inside element are fully loaded & decoded
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 800); // safety fallback timeout
        img.onload = () => {
          clearTimeout(timer);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve();
        };
      });
    })
  );
}

/**
 * Converts a target HTML DOM element directly into a PNG Blob using html-to-image
 */
export async function exportElementToPngBlob(
  element: HTMLElement,
  options: {
    pixelRatio?: number;
    backgroundColor?: string;
  } = {}
): Promise<Blob> {
  await prepareElementForCapture(element);

  const blob = await toBlob(element, {
    pixelRatio: options.pixelRatio ?? 1.5, // 1200px * 1.5 = 1800px ultra-crisp Retina
    backgroundColor: options.backgroundColor ?? '#fcf9f6',
    cacheBust: true,
  });

  if (!blob) {
    throw new Error('Failed to generate PNG blob from HTML element');
  }

  return blob;
}

/**
 * Exports the Deep Scan Report to PNG Blob directly from the HTML element.
 * If targetElement is provided, it rasterizes that element directly.
 * Otherwise, it looks up the DOM element with ID 'deep-scan-poster-export-node'.
 */
export async function exportFullDeepScanReportPng(
  report: DeepScanReport,
  targetElement?: HTMLElement | null
): Promise<Blob> {
  let element = targetElement;
  if (!element && typeof document !== 'undefined') {
    element = document.getElementById('deep-scan-poster-export-node');
  }

  if (!element) {
    throw new Error('HTML Poster export target element not found in DOM');
  }

  return exportElementToPngBlob(element, { pixelRatio: 1.5, backgroundColor: '#fcf9f6' });
}

/**
 * Exports the Share Card to PNG Blob.
 * Shares the exact same high-resolution HTML editorial poster.
 */
export async function exportShareCardPng(
  report: DeepScanReport,
  _showScore: boolean = true,
  targetElement?: HTMLElement | null
): Promise<Blob> {
  return exportFullDeepScanReportPng(report, targetElement);
}

/**
 * Triggers native browser download for a Blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
