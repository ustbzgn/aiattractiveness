import type { PortraitComparisonResult } from '@/lib/ai/deepseek';
import { buildComparePosterPrompt } from './compare-poster-prompt';
import { getToApisConfig } from './image-generation';

const MODEL = 'gpt-image-2.5-sunburst-official';
const TIMEOUT_MS = 300_000;

function requireImageUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Image service returned no image URL.');
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Image service returned an invalid image URL.');
  return url.href;
}

/**
 * Upload both Photo A and Photo B, submit once to ToAPIs, and poll the task.
 * Never resubmit a slow generation.
 */
export async function generateComparePoster(
  comparison: PortraitComparisonResult,
  portraitA: { buffer: Buffer; mimeType: string },
  portraitB: { buffer: Buffer; mimeType: string }
): Promise<PortraitComparisonResult> {
  const { apiKey, baseUrl } = getToApisConfig();

  if (!portraitA.buffer.length || portraitA.buffer.length > 10 * 1024 * 1024) {
    throw new Error('Photo A upload must be between 1 byte and 10 MB.');
  }
  if (!portraitB.buffer.length || portraitB.buffer.length > 10 * 1024 * 1024) {
    throw new Error('Photo B upload must be between 1 byte and 10 MB.');
  }

  const deadline = Date.now() + TIMEOUT_MS;

  const request = async (path: string, init: RequestInit = {}) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Compare poster generation timed out.');

    const stage =
      path === '/v1/uploads/images'
        ? 'Photo upload'
        : init.method === 'POST'
        ? 'Poster submission'
        : 'Poster status check';

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
      console.error('[Compare Poster connection]', {
        stage,
        host: new URL(baseUrl).host,
        code: code && /^[A-Z0-9_]+$/.test(code) ? code : cause.name,
      });
      throw new Error(`${stage} could not connect. Please try again shortly.`);
    }

    if (!response.ok) {
      throw new Error(`${stage} failed (${response.status}). Please try again shortly.`);
    }

    return response.json();
  };

  // 1. Upload Photo A
  const formA = new FormData();
  formA.append(
    'file',
    new Blob([new Uint8Array(portraitA.buffer)], { type: portraitA.mimeType }),
    'photo-a.jpg'
  );
  formA.append('purpose', 'generation');
  const uploadedA = await request('/v1/uploads/images', { method: 'POST', body: formA });
  if (uploadedA.success !== true) throw new Error('Photo A upload failed.');
  const portraitAUrl = requireImageUrl(uploadedA.data?.url);

  // 2. Upload Photo B
  const formB = new FormData();
  formB.append(
    'file',
    new Blob([new Uint8Array(portraitB.buffer)], { type: portraitB.mimeType }),
    'photo-b.jpg'
  );
  formB.append('purpose', 'generation');
  const uploadedB = await request('/v1/uploads/images', { method: 'POST', body: formB });
  if (uploadedB.success !== true) throw new Error('Photo B upload failed.');
  const portraitBUrl = requireImageUrl(uploadedB.data?.url);

  // 3. Submit Generation Task with both image_urls [Photo A, Photo B]
  const prompt = buildComparePosterPrompt(comparison);
  const created = await request('/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      image_urls: [portraitAUrl, portraitBUrl],
      size: '1024x1536',
      quality: 'high',
      n: 1,
    }),
  });

  const taskId = created.id || created.task_id;
  if (typeof taskId !== 'string' || !taskId) {
    throw new Error('Image service returned no task ID.');
  }

  // 4. Poll until completed
  while (Date.now() < deadline) {
    const task = await request(`/v1/images/generations/${encodeURIComponent(taskId)}`);
    if (task.status === 'completed') {
      const imageUrl = requireImageUrl(task.result?.data?.[0]?.url);
      return {
        ...comparison,
        generatedPoster: { imageUrl, taskId },
      };
    }
    if (task.status === 'failed') {
      throw new Error('Comparison poster image generation failed.');
    }
    if (!['pending', 'queued', 'in_progress'].includes(task.status)) {
      throw new Error('Image service returned an unexpected task status.');
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(2500, Math.max(0, deadline - Date.now())))
    );
  }

  throw new Error('Compare poster generation timed out.');
}
