import sharp from 'sharp';
import {
  NormalizedBoundingBox,
  DeepScanCropRegion,
  DeepScanCrops,
  sanitizeBoundingBox,
} from '@/lib/types/deep-scan';

// Maximum pixel dimension for normalized portrait photo
const MAX_PORTRAIT_DIMENSION = 1600;

export interface NormalizedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
  dataUrl: string;
}

/**
 * Standardizes uploaded image:
 * 1. Auto-rotates using EXIF orientation metadata so all coordinates match actual pixels.
 * 2. Downscales if maximum dimension exceeds 1600px while strictly preserving aspect ratio.
 * 3. Converts to high-quality JPEG Buffer and Base64 data URL.
 */
export async function normalizePortraitImage(inputBuffer: Buffer): Promise<NormalizedImageResult> {
  const pipeline = sharp(inputBuffer, { failOnError: false })
    .rotate(); // Automatically rotates orientation based on EXIF tag and strips it

  const metadata = await pipeline.metadata();
  const origW = metadata.width || 1200;
  const origH = metadata.height || 1600;

  let targetW: number | undefined = origW;
  let targetH: number | undefined = origH;

  if (origW > MAX_PORTRAIT_DIMENSION || origH > MAX_PORTRAIT_DIMENSION) {
    if (origW >= origH) {
      targetW = MAX_PORTRAIT_DIMENSION;
      targetH = undefined; // Preserves aspect ratio automatically
    } else {
      targetH = MAX_PORTRAIT_DIMENSION;
      targetW = undefined;
    }
  }

  const normalizedBuffer = await pipeline
    .resize(targetW, targetH, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();

  const finalMeta = await sharp(normalizedBuffer).metadata();
  const width = finalMeta.width || 1200;
  const height = finalMeta.height || 1600;
  const dataUrl = `data:image/jpeg;base64,${normalizedBuffer.toString('base64')}`;

  return {
    buffer: normalizedBuffer,
    width,
    height,
    mimeType: 'image/jpeg',
    dataUrl,
  };
}

/**
 * Crops a specific region given a normalized bounding box [0.0 - 1.0].
 * Ensures no stretching, no smoothing, and guards against degenerate boxes.
 */
export async function cropNormalizedBox(
  imageBuffer: Buffer,
  box: NormalizedBoundingBox | null,
  options?: {
    expandRatio?: { x: number; y: number };
    minPixelSize?: number;
  }
): Promise<string | null> {
  const sanitized = sanitizeBoundingBox(box);
  if (!sanitized) return null;

  try {
    const meta = await sharp(imageBuffer).metadata();
    const imgW = meta.width;
    const imgH = meta.height;

    if (!imgW || !imgH) return null;

    const expandX = options?.expandRatio?.x ?? 0.08;
    const expandY = options?.expandRatio?.y ?? 0.08;

    // Calculate expanded box
    let x = Math.max(0, sanitized.x - sanitized.width * expandX);
    let y = Math.max(0, sanitized.y - sanitized.height * expandY);
    let width = Math.min(1 - x, sanitized.width * (1 + expandX * 2));
    let height = Math.min(1 - y, sanitized.height * (1 + expandY * 2));

    // Convert to absolute integer pixels
    let pixelLeft = Math.round(x * imgW);
    let pixelTop = Math.round(y * imgH);
    let pixelWidth = Math.round(width * imgW);
    let pixelHeight = Math.round(height * imgH);

    // Boundary constraints
    pixelLeft = Math.max(0, Math.min(imgW - 1, pixelLeft));
    pixelTop = Math.max(0, Math.min(imgH - 1, pixelTop));
    pixelWidth = Math.max(16, Math.min(imgW - pixelLeft, pixelWidth));
    pixelHeight = Math.max(16, Math.min(imgH - pixelTop, pixelHeight));

    // Degenerate check
    if (pixelWidth < 20 || pixelHeight < 20) {
      return null;
    }

    const croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: pixelLeft,
        top: pixelTop,
        width: pixelWidth,
        height: pixelHeight,
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    return `data:image/jpeg;base64,${croppedBuffer.toString('base64')}`;
  } catch (err) {
    console.error('Error during image crop extraction:', err);
    return null;
  }
}

/**
 * Extracts all 5 required real-pixel regions:
 * 1. face: Full frontal face oval (forehead to chin, cheek to cheek)
 * 2. eyes: Horizontal band containing both eyes
 * 3. nose: Nasal bridge to alar base
 * 4. lips: Lip contour, philtrum to lower vermilion
 * 5. jawline: Mandible angles and chin lower-face rectangle
 */
export async function cropAllPortraitRegions(
  imageBuffer: Buffer,
  boxes: Record<DeepScanCropRegion, NormalizedBoundingBox | null>
): Promise<DeepScanCrops> {
  const [face, eyes, nose, lips, jawline] = await Promise.all([
    // Face: modest padding to capture complete contour
    cropNormalizedBox(imageBuffer, boxes.face, { expandRatio: { x: 0.05, y: 0.05 } }),
    // Eyes: wider horizontal aspect ratio padding
    cropNormalizedBox(imageBuffer, boxes.eyes, { expandRatio: { x: 0.12, y: 0.08 } }),
    // Nose: centered focus
    cropNormalizedBox(imageBuffer, boxes.nose, { expandRatio: { x: 0.1, y: 0.08 } }),
    // Lips: horizontal contour
    cropNormalizedBox(imageBuffer, boxes.lips, { expandRatio: { x: 0.1, y: 0.1 } }),
    // Jawline: lower face region
    cropNormalizedBox(imageBuffer, boxes.jawline, { expandRatio: { x: 0.06, y: 0.06 } }),
  ]);

  return {
    face,
    eyes,
    nose,
    lips,
    jawline,
  };
}
