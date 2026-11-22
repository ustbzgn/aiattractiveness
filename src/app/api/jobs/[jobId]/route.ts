import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { auth, resolveCurrentUserId, db, reportJob } from '@/core/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/jobs/[jobId]
 * Shared asynchronous job polling endpoint for all ColorAI Portal apps.
 * Strictly scoped to the owning session user or guest cookie.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({ headers: headerList });
    const cookieStore = await cookies();

    const userResolution = await resolveCurrentUserId(session?.user?.id || null, cookieStore);
    if (!userResolution.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;
    if (!jobId) {
      return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
    }

    const rows = await db
      .select()
      .from(reportJob)
      .where(eq(reportJob.id, jobId))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = rows[0];
    if (job.userId !== userResolution.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = (job.inputParams as { app?: string; mode?: string } | null) || {};

    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      app: params.app || 'attractiveness',
      mode: params.mode || 'deep',
      data: job.status === 'completed' ? job.result : null,
      error: job.error || null,
    });
  } catch (err) {
    console.error('[API Job Status Error]:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}
