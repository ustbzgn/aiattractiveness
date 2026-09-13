import { NextRequest, NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import {
  analyzePortraitWithDeepSeek,
  analyzePortraitDeepWithDeepSeek,
  comparePortraitsWithDeepSeek,
  PortraitAnalysisResult,
  PortraitComparisonResult,
} from '@/lib/ai/deepseek';
import { normalizePortraitImage } from '@/lib/ai/portrait-crop';
import { DeepScanReport, DEEP_SCAN_FIXTURES } from '@/lib/types/deep-scan';
import {
  deductCredits,
  refundCredits,
  InsufficientCreditsError,
  getOrCreateUserWallet,
} from '@/lib/credits/wallet';
import { getOrCreateCurrentUserId } from '@/lib/auth/guest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Maximum upload payload size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Guest free trial limits for uncredited visitors
const MAX_GUEST_FAST_TRIALS = 2;
const GUEST_TRIAL_COOKIE_NAME = 'aat_guest_trials';

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

    // 1. Resolve User Identity (Session User or 2-Year Guest Cookie)
    const userResolution = await getOrCreateCurrentUserId(session?.user?.id || null, cookieStore);
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
    const referenceId = `rep_${Date.now()}`;

    // 2. Check Wallet Balance
    const wallet = await getOrCreateUserWallet(targetUserId);

    // If user has insufficient credits:
    if (wallet.balance < creditsCost) {
      // If it's a guest trying Fast test, check if they have free trials left
      if (userResolution.isGuest && mode === 'fast') {
        const rawCookie = req.cookies.get(GUEST_TRIAL_COOKIE_NAME)?.value || '0';
        const guestTrialsUsed = parseInt(rawCookie, 10) || 0;

        if (guestTrialsUsed < MAX_GUEST_FAST_TRIALS) {
          // Process guest free fast analysis
          const file = (formData.get('photo') || formData.get('file')) as File | null;
          if (!file) {
            return NextResponse.json(
              { error: 'A portrait photo is required for analysis.' },
              { status: 400 }
            );
          }

          const { buffer, mimeType } = await fileToBuffer(file);
          const base64 = buffer.toString('base64');
          const analysis: PortraitAnalysisResult = await analyzePortraitWithDeepSeek(
            base64,
            mimeType,
            'fast'
          );

          const nextCount = guestTrialsUsed + 1;
          const res = NextResponse.json({
            success: true,
            mode: 'fast',
            isGuest: true,
            guestTrialsUsed: nextCount,
            guestTrialsRemaining: Math.max(0, MAX_GUEST_FAST_TRIALS - nextCount),
            data: analysis,
          });

          res.cookies.set({
            name: GUEST_TRIAL_COOKIE_NAME,
            value: nextCount.toString(),
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
            httpOnly: false,
            sameSite: 'lax',
          });

          return res;
        }
      }

      // Otherwise return 402 Insufficient Credits (client will open checkout modal)
      return NextResponse.json(
        {
          error: `Insufficient credits. This analysis requires ${creditsCost} credits, but you have ${wallet.balance}.`,
          code: 'INSUFFICIENT_CREDITS',
          currentBalance: wallet.balance,
          requiredAmount: creditsCost,
        },
        { status: 402 }
      );
    }

    // 3. User (Logged-in or Guest with Credits) has sufficient balance -> Deduct Credits
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

    // 4. Model execution with automatic refund on failure
    try {
      if (mode === 'compare') {
        const fileA = formData.get('photoA') as File | null;
        const fileB = formData.get('photoB') as File | null;

        if (!fileA || !fileB) {
          await refundCredits(targetUserId, creditsCost, referenceId, 'Missing comparison image files');
          return NextResponse.json(
            { error: 'Both Photo A and Photo B are required for face comparison.' },
            { status: 400 }
          );
        }

        const { buffer: bufA, mimeType: mimeA } = await fileToBuffer(fileA);
        const { buffer: bufB, mimeType: mimeB } = await fileToBuffer(fileB);

        const comparison: PortraitComparisonResult = await comparePortraitsWithDeepSeek(
          { base64: bufA.toString('base64'), mimeType: mimeA },
          { base64: bufB.toString('base64'), mimeType: mimeB }
        );

        return NextResponse.json({
          success: true,
          mode: 'compare',
          creditsDeducted: creditsCost,
          balanceRemaining: debitResult.balanceRemaining,
          data: comparison,
        });
      } else if (mode === 'deep') {
        // Deep Scan 6-dimension evaluation + 5-region real pixel cropping
        const file = (formData.get('photo') || formData.get('file')) as File | null;

        if (!file) {
          await refundCredits(targetUserId, creditsCost, referenceId, 'Missing photo file');
          return NextResponse.json(
            { error: 'A portrait photo is required for deep analysis.' },
            { status: 400 }
          );
        }

        const { buffer: rawBuffer } = await fileToBuffer(file);

        // Normalize image (EXIF auto-orientation, max 1600px edge, high-quality buffer)
        const normalized = await normalizePortraitImage(rawBuffer);

        const deepReport: DeepScanReport = await analyzePortraitDeepWithDeepSeek(
          normalized.buffer,
          normalized.buffer.toString('base64'),
          normalized.mimeType
        );

        // If not analyzable, auto refund credits
        if (!deepReport.isAnalyzable) {
          await refundCredits(
            targetUserId,
            creditsCost,
            referenceId,
            `Refund: ${deepReport.unusableReason || 'Photo not analyzable'}`
          );
        }

        return NextResponse.json({
          success: true,
          mode: 'deep',
          creditsDeducted: deepReport.isAnalyzable ? creditsCost : 0,
          balanceRemaining: deepReport.isAnalyzable
            ? debitResult.balanceRemaining
            : debitResult.balanceRemaining + creditsCost,
          data: deepReport,
        });
      } else {
        // Fast Scan Mode
        const file = (formData.get('photo') || formData.get('file')) as File | null;

        if (!file) {
          await refundCredits(targetUserId, creditsCost, referenceId, 'Missing photo file');
          return NextResponse.json(
            { error: 'A portrait photo is required for analysis.' },
            { status: 400 }
          );
        }

        const { buffer, mimeType } = await fileToBuffer(file);
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
      }
    } catch (aiError) {
      // Automatic failsafe refund
      console.error('[AI Processing Error, Refunding Credits]:', aiError);
      await refundCredits(
        targetUserId,
        creditsCost,
        referenceId,
        `Refund due to analysis error: ${aiError instanceof Error ? aiError.message : 'Unknown'}`
      );
      throw aiError;
    }
  } catch (error) {
    console.error('[API Portrait Analysis Error]:', error);
    const message =
      error instanceof Error ? error.message : 'Internal error processing portrait analysis';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
