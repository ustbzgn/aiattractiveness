import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { auth, resolveCurrentUserId } from '@/core/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/apps/color-analysis
 * Feature API shell for Personal Color Analysis.
 * Shares ColorAI Portal auth, credits, and async job polling (/api/jobs/[jobId]).
 */
export async function POST() {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });
  const cookieStore = await cookies();
  await resolveCurrentUserId(session?.user?.id || null, cookieStore);

  return NextResponse.json(
    {
      success: false,
      error: 'Personal Color Analysis is coming soon.',
    },
    { status: 501 }
  );
}
