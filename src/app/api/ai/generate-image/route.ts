import { NextRequest, NextResponse } from 'next/server';
import { generateImage, GptImageModel, ImageAspectSize, ImageResolution } from '@/lib/ai/image-generation';

/**
 * POST /api/ai/generate-image
 *
 * Request Body:
 * {
 *   prompt: string;
 *   referenceImages?: string[]; // optional image URLs
 *   model?: 'gpt-image-2.5-flare' | 'gpt-image-2.5-sunburst';
 *   size?: '1:1' | '16:9' | '9:16' | '3:2' | '2:3' | ...;
 *   resolution?: '1K' | '2K' | '4K';
 *   background?: 'transparent';
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      prompt,
      referenceImages,
      model,
      size = '1:1',
      resolution = '1K',
      background,
    } = body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (referenceImages && !Array.isArray(referenceImages)) {
      return NextResponse.json(
        { error: 'referenceImages must be an array of image URLs' },
        { status: 400 }
      );
    }

    const result = await generateImage({
      prompt: prompt.trim(),
      referenceImages: referenceImages && referenceImages.length > 0 ? referenceImages : undefined,
      model: model as GptImageModel,
      size: size as ImageAspectSize,
      resolution: resolution as ImageResolution,
      background: background === 'transparent' ? 'transparent' : undefined,
    });

    return NextResponse.json({
      success: true,
      taskId: result.taskId,
      imageUrl: result.imageUrl,
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}
