import type { DeepScanReport } from '@/lib/types/deep-scan';
import { buildDeepScanPosterPrompt } from './deep-scan-poster-prompt';
import { getToApisConfig } from './image-generation';

const MODEL = 'gpt-image-2.5-sunburst-official';
const TIMEOUT_MS = 300_000;

function requireImageUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Image service returned no image URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Image service returned an invalid image URL.');
  return url.href;
}

/** Upload once, submit once, poll the same task. Never resubmit a slow generation. */
export async function generateDeepScanPoster(
  report: DeepScanReport,
  portrait: { buffer: Buffer; mimeType: string },
): Promise<DeepScanReport> {
  if (!report.isAnalyzable) return report;
  const { apiKey, baseUrl } = getToApisConfig();
  if (!portrait.buffer.length || portrait.buffer.length > 10 * 1024 * 1024) {
    throw new Error('Portrait upload must be between 1 byte and 10 MB.');
  }
  const deadline = Date.now() + TIMEOUT_MS;
  const request = async (path: string, init: RequestInit = {}) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Report generation timed out.');
    const stage = path === '/v1/uploads/images' ? 'Photo upload'
      : init.method === 'POST' ? 'Report submission' : 'Report status check';
    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(Math.min(60_000, remaining)),
      cache: 'no-store',
      });
    } catch (error) {
      const cause = error as { name?: string; cause?: { code?: string } };
      const code = cause.cause?.code;
      console.error('[Deep Scan connection]', { stage, host: new URL(baseUrl).host,
        code: code && /^[A-Z0-9_]+$/.test(code) ? code : cause.name });
      throw new Error(`${stage} could not connect. Please try again shortly.`);
    }
    // Never expose provider response bodies, uploaded URLs or credentials in errors.
    if (!response.ok) throw new Error(`${stage} failed (${response.status}). Please try again shortly.`);
    return response.json();
  };

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(portrait.buffer)], { type: portrait.mimeType }), 'portrait.jpg');
  form.append('purpose', 'generation');
  const uploaded = await request('/v1/uploads/images', { method: 'POST', body: form });
  if (uploaded.success !== true) throw new Error('Portrait upload failed.');
  const portraitUrl = requireImageUrl(uploaded.data?.url);

  const created = await request('/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildDeepScanPosterPrompt(report),
      image_urls: [portraitUrl],
      size: '1024x1536', quality: 'high', n: 1,
    }),
  });
  const taskId = created.id || created.task_id;
  if (typeof taskId !== 'string' || !taskId) throw new Error('Image service returned no task ID.');

  while (Date.now() < deadline) {
    const task = await request(`/v1/images/generations/${encodeURIComponent(taskId)}`);
    if (task.status === 'completed') {
      const imageUrl = requireImageUrl(task.result?.data?.[0]?.url);
      // Return the generated report, without echoing the original photo or obsolete crops.
      return { ...report, originalImageUrl: undefined, rawNormalizedBoxes: undefined,
        crops: { face: null, eyes: null, nose: null, lips: null, jawline: null },
        generatedPoster: { imageUrl, taskId } };
    }
    if (task.status === 'failed') throw new Error('Report image generation failed.');
    if (!['pending', 'queued', 'in_progress'].includes(task.status)) {
      throw new Error('Image service returned an unexpected task status.');
    }
    await new Promise(resolve => setTimeout(resolve, Math.min(2500, Math.max(0, deadline - Date.now()))));
  }
  throw new Error('Report generation timed out.');
}
