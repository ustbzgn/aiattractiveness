import { NextRequest, NextResponse, after } from 'next/server';
import { headers, cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import {
  auth,
  db,
  reportJob,
  deductCredits,
  refundCredits,
  InsufficientCreditsError,
  resolveCurrentUserId,
  normalizePortraitImage,
} from '@/core/server';
import { generateDeepScanPoster } from '@/features/attractiveness/server/deep-scan-poster';
import { generateComparePoster } from '@/features/attractiveness/server/compare-poster';
import {
  analyzePortraitWithDeepSeek,
  analyzePortraitDeepWithDeepSeek,
  comparePortraitsWithDeepSeek,
  PortraitAnalysisResult,
  PortraitComparisonResult,
} from '@/features/attractiveness/server/deepseek';
import { DeepScanReport, DEEP_SCAN_FIXTURES } from '@/features/attractiveness/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 420;

// Maximum upload payload size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Helper to convert a File object from FormData into Buffer and mimeType
 */
async function fileToBuffer(file: File): Promise<{ buffer: Buffer; mimeType: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File ${file.name} exceeds maximum allowed size of 10MB`);
  }

  const mimeType = file.type || 'image/jpeg';
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`File ${file.name} has unsupported MIME type: ${mimeType}`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, mimeType };
}

export async function POST(req: NextRequest) {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({ headers: headerList });
    const cookieStore = await cookies();

    // 1. Resolve User Identity (Session User or existing 2-Year Guest Cookie; never create DB rows here)
    const userResolution = await resolveCurrentUserId(session?.user?.id || null, cookieStore);
    const targetUserId = userResolution.userId;

    const formData = await req.formData();
    const mode = (formData.get('mode') as string) || 'fast'; // 'fast' | 'deep' | 'compare'
    const previewFixture = formData.get('previewFixture') as string | null;

    // DEV/TESTING PREVIEW HOOK: if dev requested a fixture, return immediately without debit
    if (process.env.NODE_ENV !== 'production' && previewFixture && previewFixture in DEEP_SCAN_FIXTURES) {
      const fixtureKey = previewFixture as keyof typeof DEEP_SCAN_FIXTURES;
      return NextResponse.json({
        success: true,
        mode: 'deep',
        isDevPreview: true,
        creditsDeducted: 0,
        data: DEEP_SCAN_FIXTURES[fixtureKey],
      });
    }

    // Cost definition: Fast: 10 credits ($0.50), Deep: 40 credits ($2.00), Compare: 50 credits ($2.50)
    const creditsCost = mode === 'fast' ? 10 : mode === 'deep' ? 40 : 50;
    const referenceId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Anonymous visitor with no session and no guest cookie -> 0 credits
    if (!targetUserId) {
      return NextResponse.json(
        {
          error: `Insufficient credits. This analysis requires ${creditsCost} credits, but you have 0.`,
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: 0,
          requiredAmount: creditsCost,
        },
        { status: 402 }
      );
    }

    // Validate & read uploaded files BEFORE deducting credits
    if (mode === 'compare') {
      const fileA = formData.get('photoA') as File | null;
      const fileB = formData.get('photoB') as File | null;

      if (!fileA || !fileB) {
        return NextResponse.json(
          { error: 'Both Photo A and Photo B are required for face comparison.' },
          { status: 400 }
        );
      }

      const { buffer: bufA } = await fileToBuffer(fileA);
      const { buffer: bufB } = await fileToBuffer(fileB);
      const normalizedA = await normalizePortraitImage(bufA);
      const normalizedB = await normalizePortraitImage(bufB);

      let debitResult;
      try {
        debitResult = await deductCredits(
          targetUserId,
          creditsCost,
          referenceId,
          `Portrait analysis fee (${mode})`
        );
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: `Insufficient credits. This analysis requires ${creditsCost} credits, but you have ${err.currentBalance}.`,
              code: 'INSUFFICIENT_CREDITS',
              currentBalance: err.currentBalance,
              requiredAmount: creditsCost,
            },
            { status: 402 }
          );
        }
        throw err;
      }

      try {
        await db.insert(reportJob).values({
          id: referenceId,
          userId: targetUserId,
          status: 'processing',
          creditsCost,
          inputParams: { app: 'attractiveness', mode: 'compare' },
        });
      } catch (dbErr) {
        await refundCredits(targetUserId, creditsCost, referenceId, 'Refund: failed to queue compare job');
        throw dbErr;
      }

      // Run slow VLM + poster generation asynchronously after 202 response to avoid proxy timeouts
      after(async () => {
        try {
          let comparison: PortraitComparisonResult = await comparePortraitsWithDeepSeek(
            { base64: normalizedA.buffer.toString('base64'), mimeType: normalizedA.mimeType },
            { base64: normalizedB.buffer.toString('base64'), mimeType: normalizedB.mimeType }
          );
          comparison = await generateComparePoster(comparison, normalizedA, normalizedB);

          await db
            .update(reportJob)
            .set({
              status: 'completed',
              result: comparison as unknown as Record<string, unknown>,
              completedAt: new Date(),
            })
            .where(eq(reportJob.id, referenceId));
        } catch (aiError) {
          console.error('[Async Compare Error, Refunding Credits]:', aiError);
          await refundCredits(
            targetUserId,
            creditsCost,
            referenceId,
            `Refund due to analysis error: ${aiError instanceof Error ? aiError.message : 'Unknown'}`
          );
          await db
            .update(reportJob)
            .set({
              status: 'failed',
              error: 'Comparison could not be completed. Your credits have been refunded.',
              completedAt: new Date(),
            })
            .where(eq(reportJob.id, referenceId));
        }
      });

      return NextResponse.json(
        {
          success: true,
          async: true,
          jobId: referenceId,
          mode: 'compare',
          creditsDeducted: creditsCost,
          balanceRemaining: debitResult.balanceRemaining,
        },
        { status: 202 }
      );
    }

    if (mode === 'deep') {
      const file = (formData.get('photo') || formData.get('file')) as File | null;
      if (!file) {
        return NextResponse.json(
          { error: 'A portrait photo is required for deep analysis.' },
          { status: 400 }
        );
      }

      const { buffer: rawBuffer } = await fileToBuffer(file);
      const normalized = await normalizePortraitImage(rawBuffer);

      let debitResult;
      try {
        debitResult = await deductCredits(
          targetUserId,
          creditsCost,
          referenceId,
          `Portrait analysis fee (${mode})`
        );
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          return NextResponse.json(
            {
              error: `Insufficient credits. This analysis requires ${creditsCost} credits, but you have ${err.currentBalance}.`,
              code: 'INSUFFICIENT_CREDITS',
              currentBalance: err.currentBalance,
              requiredAmount: creditsCost,
            },
            { status: 402 }
          );
        }
        throw err;
      }

      try {
        await db.insert(reportJob).values({
          id: referenceId,
          userId: targetUserId,
          status: 'processing',
          creditsCost,
          inputParams: { app: 'attractiveness', mode: 'deep' },
        });
      } catch (dbErr) {
        await refundCredits(targetUserId, creditsCost, referenceId, 'Refund: failed to queue deep scan job');
        throw dbErr;
      }

      // Run slow VLM + poster generation asynchronously after 202 response to avoid proxy timeouts
      after(async () => {
        try {
          let deepReport: DeepScanReport = await analyzePortraitDeepWithDeepSeek(
            normalized.buffer,
            normalized.buffer.toString('base64'),
            normalized.mimeType,
            { cropRegions: false }
          );

          if (deepReport.isAnalyzable) {
            deepReport = await generateDeepScanPoster(deepReport, normalized);
          } else {
            await refundCredits(
              targetUserId,
              creditsCost,
              referenceId,
              `Refund: ${deepReport.unusableReason || 'Photo not analyzable'}`
            );
          }

          await db
            .update(reportJob)
            .set({
              status: 'completed',
              creditsCost: deepReport.isAnalyzable ? creditsCost : 0,
              result: deepReport as unknown as Record<string, unknown>,
              completedAt: new Date(),
            })
            .where(eq(reportJob.id, referenceId));
        } catch (aiError) {
          console.error('[Async Deep Scan Error, Refunding Credits]:', aiError);
          await refundCredits(
            targetUserId,
            creditsCost,
            referenceId,
            `Refund due to analysis error: ${aiError instanceof Error ? aiError.message : 'Unknown'}`
          );
          await db
            .update(reportJob)
            .set({
              status: 'failed',
              error: 'Deep portrait analysis could not be completed. Your credits have been refunded.',
              completedAt: new Date(),
            })
            .where(eq(reportJob.id, referenceId));
        }
      });

      return NextResponse.json(
        {
          success: true,
          async: true,
          jobId: referenceId,
          mode: 'deep',
          creditsDeducted: creditsCost,
          balanceRemaining: debitResult.balanceRemaining,
        },
        { status: 202 }
      );
    }

    // Fast Scan Mode (synchronous, typically finishes within a few seconds)
    const file = (formData.get('photo') || formData.get('file')) as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'A portrait photo is required for analysis.' },
        { status: 400 }
      );
    }

    const { buffer, mimeType } = await fileToBuffer(file);

    let debitResult;
    try {
      debitResult = await deductCredits(
        targetUserId,
        creditsCost,
        referenceId,
        `Portrait analysis fee (${mode})`
      );
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        return NextResponse.json(
          {
            error: `Insufficient credits. This analysis requires ${creditsCost} credits, but you have ${err.currentBalance}.`,
            code: 'INSUFFICIENT_CREDITS',
            currentBalance: err.currentBalance,
            requiredAmount: creditsCost,
          },
          { status: 402 }
        );
      }
      throw err;
    }

    try {
      const analysis: PortraitAnalysisResult = await analyzePortraitWithDeepSeek(
        buffer.toString('base64'),
        mimeType,
        'fast'
      );

      return NextResponse.json({
        success: true,
        mode: 'fast',
        creditsDeducted: creditsCost,
        balanceRemaining: debitResult.balanceRemaining,
        data: analysis,
      });
    } catch (aiError) {
      console.error('[AI Processing Error, Refunding Credits]:', aiError);
      await refundCredits(
        targetUserId,
        creditsCost,
        referenceId,
        `Refund due to analysis error: ${aiError instanceof Error ? aiError.message : 'Unknown'}`
      );
      return NextResponse.json(
        { error: 'Portrait analysis could not be completed. Your credits have been refunded.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API Portrait Analysis Error]:', error);
    return NextResponse.json(
      { error: 'Unable to process portrait analysis right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
