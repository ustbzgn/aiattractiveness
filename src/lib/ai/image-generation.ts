/**
 * GPT-Image-2.5 (ToAPIs) Image Generation Client
 *
 * Implements text-to-image and reference-image-to-image generation
 * using the ToAPIs GPT-Image-2.5 asynchronous task pipeline.
 */

export type GptImageModel =
  | 'gpt-image-2.5-flare'
  | 'gpt-image-2.5-sunburst'
  | 'gpt-image-2.5-flare-vip'
  | 'gpt-image-2.5-sunburst-vip';

export type ImageAspectSize =
  | '1:1'
  | '3:2'
  | '2:3'
  | '4:3'
  | '3:4'
  | '5:4'
  | '4:5'
  | '16:9'
  | '9:16'
  | '21:9'
  | string; // Also accepts explicit pixel sizes like '1024x1024', '1024x1536'

export type ImageQuality = 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export type ImageResolution = '1K' | '2K' | '4K' | '1k' | '2k' | '4k';

export interface ImageGenerationOptions {
  /**
   * Prompt describing what to generate or modify.
   * If using reference images, describe what to keep and what to change.
   */
  prompt: string;

  /**
   * Optional reference image URLs for image-to-image workflows.
   * URLs must be publicly accessible by the server.
   */
  referenceImages?: string[];

  /**
   * Model name. Defaults to 'gpt-image-2.5-flare' or TOAPIS_IMAGE_MODEL env.
   */
  model?: GptImageModel | string;

  /**
   * Aspect ratio ('1:1', '2:3' etc.) or pixel size ('1024x1024', '1024x1536').
   */
  size?: ImageAspectSize;

  /**
   * Quality grade: 'low' | 'medium' | 'high' | 'xhigh' | 'max'. (Defaults to 'high')
   */
  quality?: ImageQuality;

  /**
   * Resolution tier for standard model: '1K' | '2K' | '4K'. (Omitted for VIP)
   */
  resolution?: ImageResolution;

  /**
   * Optional background style: pass 'transparent' for PNG with alpha channel.
   */
  background?: 'transparent';

  /**
   * Milliseconds between task poll requests (default: 2500ms).
   */
  pollIntervalMs?: number;

  /**
   * Total timeout before giving up on the task (default: 180000ms / 3 mins).
   */
  timeoutMs?: number;

  /**
   * Optional progress callback for real-time UI status updates.
   */
  onProgress?: (task: TaskStatusResponse) => void;
}

export interface TaskCreationResponse {
  id: string;
  object: string;
  model: string;
  status: 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  created_at?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskStatusResponse {
  id: string;
  status: 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed';
  progress?: number;
  model?: string;
  result?: {
    data?: Array<{
      url?: string;
      b64_json?: string;
    }>;
  };
  error?: {
    message?: string;
    code?: string | number;
  } | string;
}

export interface ImageGenerationResult {
  taskId: string;
  imageUrl: string;
  raw: TaskStatusResponse;
}

export function getToApisConfig() {
  const apiKey = process.env.TOAPIS_API_KEY || process.env.GPT_IMAGE_API_KEY;
  // Default to https://api.toapis.com, but can be overridden with https://api.toapis.cn for mainland China
  const baseUrl = (process.env.TOAPIS_BASE_URL || 'https://api.toapis.com').replace(/\/$/, '');
  const defaultModel = (process.env.TOAPIS_IMAGE_MODEL || 'gpt-image-2.5-flare') as GptImageModel;

  if (!apiKey) {
    throw new Error(
      'Missing TOAPIS_API_KEY in environment variables. Please add TOAPIS_API_KEY="your_api_key" into .env.local'
    );
  }

  return { apiKey, baseUrl, defaultModel };
}

// Helper: map common aspect ratios to VIP pixel dimensions
const ASPECT_RATIO_TO_PIXELS: Record<string, string> = {
  '1:1': '1024x1024',
  '3:2': '1536x1024',
  '2:3': '1024x1536',
  '4:3': '1360x1024',
  '3:4': '1024x1360',
  '16:9': '1536x864',
  '9:16': '864x1536',
  '5:4': '1280x1024',
  '4:5': '1024x1280',
  '21:9': '1792x768',
};

/**
 * 1. Submit an image generation task
 * Supports both standard ('gpt-image-2.5-flare') and VIP ('gpt-image-2.5-*-vip') models
 */
export async function submitImageTask(
  options: Omit<ImageGenerationOptions, 'pollIntervalMs' | 'timeoutMs' | 'onProgress'>
): Promise<TaskCreationResponse> {
  const { apiKey, baseUrl, defaultModel } = getToApisConfig();
  const requestedModel = (options.model || defaultModel) as string;
  const isVip = requestedModel.toLowerCase().includes('vip');

  const requestedQuality = options.quality || 'high';
  const rawSize = options.size || (isVip ? '1024x1024' : '1:1');

  // For VIP: if reference image is present, VIP uses POST /v1/images/edits via multipart/form-data
  if (isVip && options.referenceImages && options.referenceImages.length > 0) {
    const vipSize = ASPECT_RATIO_TO_PIXELS[rawSize] || rawSize;
    const formData = new FormData();
    formData.append('model', requestedModel);
    formData.append('prompt', options.prompt);
    formData.append('image', options.referenceImages[0]);
    formData.append('quality', requestedQuality);
    formData.append('size', vipSize);
    formData.append('n', '1');

    if (options.background) {
      formData.append('background', options.background);
    }

    const response = await fetch(`${baseUrl}/v1/images/edits`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to submit VIP image edit task (${response.status}): ${errorBody}`);
    }

    return (await response.json()) as TaskCreationResponse;
  }

  // Standard JSON creation (Text-to-Image for both, or Standard Image-to-Image)
  const payload: Record<string, unknown> = {
    model: requestedModel,
    prompt: options.prompt,
    quality: requestedQuality,
    n: 1,
  };

  if (isVip) {
    // VIP requires exact pixel dimensions (e.g., '1024x1536'), and MUST omit resolution
    payload.size = ASPECT_RATIO_TO_PIXELS[rawSize] || rawSize;
  } else {
    // Standard model requires aspect ratio (e.g. '1:1', '2:3') and resolution (e.g. '1K')
    payload.size = rawSize;
    payload.resolution = options.resolution || '1K';
  }

  if (options.background) {
    payload.background = options.background;
  }

  if (options.referenceImages && options.referenceImages.length > 0) {
    payload.reference_images = options.referenceImages;
  }

  const response = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to submit image task (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as TaskCreationResponse;
}

/**
 * 2. Query the status of a specific task
 */
export async function queryImageTask(taskId: string): Promise<TaskStatusResponse> {
  const { apiKey, baseUrl } = getToApisConfig();

  const response = await fetch(`${baseUrl}/v1/images/generations/${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to query task ${taskId} (${response.status}): ${errorBody}`);
  }

  return (await response.json()) as TaskStatusResponse;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 3. High-level Universal Generator: Submit prompt + Poll until image is ready
 *
 * @example
 * const { imageUrl } = await generateImage({
 *   prompt: '儿童绘本风格, 一位兽医用听诊器给小水獭检查心跳',
 *   size: '1:1',
 *   resolution: '1K'
 * });
 *
 * @example
 * // With reference image:
 * const { imageUrl } = await generateImage({
 *   prompt: '保留参考图中的小水獭和兽医, 给小水獭增加一条黄色围巾',
 *   referenceImages: ['https://example.com/otter.png'],
 *   size: '1:1',
 *   resolution: '2K'
 * });
 */
export async function generateImage(options: ImageGenerationOptions): Promise<ImageGenerationResult> {
  const pollInterval = options.pollIntervalMs || 2500;
  const timeout = options.timeoutMs || 180000; // 3 minutes default

  // Step 1: Submit task
  const task = await submitImageTask(options);
  if (!task.id) {
    throw new Error('Task creation succeeded but received no task ID.');
  }

  const startTime = Date.now();

  // Step 2: Poll status until finished
  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error(`Image generation task ${task.id} timed out after ${timeout / 1000}s`);
    }

    const currentStatus = await queryImageTask(task.id);

    if (options.onProgress) {
      options.onProgress(currentStatus);
    }

    if (currentStatus.status === 'completed') {
      const imageUrl = currentStatus.result?.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error(`Task marked completed, but no image URL was found in result.data.`);
      }

      return {
        taskId: task.id,
        imageUrl,
        raw: currentStatus,
      };
    }

    if (currentStatus.status === 'failed') {
      const errorMsg =
        typeof currentStatus.error === 'string'
          ? currentStatus.error
          : currentStatus.error?.message || 'Unknown task failure';
      throw new Error(`Image generation task ${task.id} failed: ${errorMsg}`);
    }

    // Wait before next poll
    await sleep(pollInterval);
  }
}
