import sharp from 'sharp';

const MAX_IMAGE_DIMENSION = 1600;

export interface NormalizedImageResult {
  buffer: Buffer;
  width: number;
  height: number;
  mimeType: 'image/jpeg';
  dataUrl: string;
}

/**
 * Shared image normalization utility for all ColorAI Portal apps:
 * 1. Auto-rotates based on EXIF orientation metadata and strips orientation tags.
 * 2. Downscales if the longest edge exceeds 1600px while preserving aspect ratio.
 * 3. Outputs a high-quality JPEG Buffer and Base64 data URL.
 */
export async function normalizePortraitImage(
  inputBuffer: Buffer,
  maxDimension: number = MAX_IMAGE_DIMENSION
): Promise<NormalizedImageResult> {
  const pipeline = sharp(inputBuffer, { failOnError: false }).rotate();
  const metadata = await pipeline.metadata();
  const origW = metadata.width || 1200;
  const origH = metadata.height || 1600;

  let targetW: number | undefined = origW;
  let targetH: number | undefined = origH;

  if (origW > maxDimension || origH > maxDimension) {
    if (origW >= origH) {
      targetW = maxDimension;
      targetH = undefined;
    } else {
      targetH = maxDimension;
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
