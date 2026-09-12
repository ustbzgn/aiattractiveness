import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getOrCreateUserWallet } from '@/lib/credits/wallet';
import { getOrCreateCurrentUserId } from '@/lib/auth/guest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({ headers: headerList });
    const cookieStore = await cookies();

    // Resolve user ID: authenticated user or persistent 2-year guest
    const userResolution = await getOrCreateCurrentUserId(session?.user?.id || null, cookieStore);
    const targetUserId = userResolution.userId;

    const wallet = await getOrCreateUserWallet(targetUserId);

    return NextResponse.json({
      success: true,
      authenticated: !userResolution.isGuest,
      isGuest: userResolution.isGuest,
      balance: wallet.balance,
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        lifetimeGranted: wallet.lifetimeGranted,
        lifetimeSpent: wallet.lifetimeSpent,
      },
    });
  } catch (error) {
    console.error('[API Credits Inquiry Error]:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve credit balance' },
      { status: 500 }
    );
  }
}
