import { NextResponse } from 'next/server';
import { headers, cookies } from 'next/headers';
import { auth } from '@/lib/auth';
import { getOrCreateUserWallet, getUserWallet } from '@/lib/credits/wallet';
import { resolveCurrentUserId } from '@/lib/auth/guest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const headerList = await headers();
    const session = await auth.api.getSession({ headers: headerList });
    const cookieStore = await cookies();

    // Read-only resolution: never create DB records for anonymous visitors without a cookie
    const userResolution = await resolveCurrentUserId(session?.user?.id || null, cookieStore);

    if (!userResolution.userId) {
      return NextResponse.json({
        success: true,
        authenticated: false,
        isGuest: true,
        balance: 0,
        wallet: {
          id: null,
          balance: 0,
          lifetimeGranted: 0,
          lifetimeSpent: 0,
        },
      });
    }

    const wallet = userResolution.isGuest
      ? await getUserWallet(userResolution.userId)
      : await getOrCreateUserWallet(userResolution.userId, 0);

    const balance = wallet?.balance ?? 0;

    return NextResponse.json({
      success: true,
      authenticated: !userResolution.isGuest,
      isGuest: userResolution.isGuest,
      balance,
      wallet: {
        id: wallet?.id ?? null,
        balance,
        lifetimeGranted: wallet?.lifetimeGranted ?? 0,
        lifetimeSpent: wallet?.lifetimeSpent ?? 0,
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
