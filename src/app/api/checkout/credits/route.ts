import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCreditPackageById } from '@/lib/credits/packages';
import { getPaymentProvider } from '@/lib/payment/waffo';
import { db } from '@/lib/db';
import { creditOrder } from '@/lib/db/schema';
import { CreditService } from '@/lib/credits/service';
import { getOrCreateCurrentUserId, GUEST_COOKIE_NAME, GUEST_COOKIE_MAX_AGE } from '@/lib/auth/guest';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout/credits
 * Initiates Waffo Pancake checkout for a one-time credit pack.
 *
 * Supports both:
 * 1. Logged-in authenticated users.
 * 2. Seamless Guest Checkout (2-year persistent cookie identity).
 */
export async function POST(request: Request) {
  // 1. Resolve user (Authenticated or Guest with 2-year lifespan)
  const session = await auth.api.getSession({ headers: request.headers });
  const userResolution = await getOrCreateCurrentUserId(session?.user?.id || null);
  const targetUserId = userResolution.userId;
  const userEmail = session?.user?.email || 'guest@customer.waffo';

  // 2. Validate request body
  let body: { packId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { packId } = body;
  if (!packId) {
    return NextResponse.json({ error: 'Missing packId parameter' }, { status: 400 });
  }

  const pack = getCreditPackageById(packId);
  if (!pack) {
    return NextResponse.json({ error: 'Invalid credit package selected' }, { status: 400 });
  }

  // 3. Resolve app callback origin
  const origin = request.headers.get('origin') || request.headers.get('referer');
  let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
  if (origin) {
    try {
      appUrl = new URL(origin).origin;
    } catch {}
  }
  appUrl = appUrl.replace(/\/+$/, '');

  const successUrl = `${appUrl}/checkout/status`;
  const cancelUrl = `${appUrl}/`;

  // 4. Create checkout session via payment provider
  try {
    const payment = getPaymentProvider();
    const result = await payment.createCreditCheckout({
      userId: targetUserId,
      userEmail,
      packId: pack.id,
      credits: pack.credits,
      priceUsd: pack.priceUsd,
      successUrl,
      cancelUrl,
    });

    // 5. Store pending order record
    const orderId = result.orderId || `ord_${result.sessionId}`;
    const isMock = orderId.startsWith('demo_ord_') || (result.checkoutUrl && result.checkoutUrl.includes('mock=true'));

    if (isMock) {
      try {
        await CreditService.grantCreditsFromOrder({
          orderId,
          userId: targetUserId,
          packId: pack.id,
          amountUsd: pack.priceUsd.toFixed(2),
          currency: 'USD',
        });
      } catch (mockGrantErr) {
        console.warn('[checkout] mock credit grant error:', mockGrantErr);
      }
    } else {
      try {
        await db.insert(creditOrder).values({
          id: `local_ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          orderId,
          userId: targetUserId,
          packId: pack.id,
          credits: pack.credits,
          amountUsd: pack.priceUsd.toFixed(2),
          currency: 'USD',
          status: 'pending',
          checkoutSessionId: result.sessionId,
        });
      } catch (dbErr) {
        console.warn('[checkout] database record insert deferred or failed:', dbErr);
      }
    }

    const response = NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      orderId,
      sessionId: result.sessionId,
    });

    // If guest, set 2-year persistent cookie on response
    if (userResolution.isGuest && userResolution.guestId) {
      response.cookies.set({
        name: GUEST_COOKIE_NAME,
        value: userResolution.guestId,
        maxAge: GUEST_COOKIE_MAX_AGE,
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    return response;
  } catch (err) {
    console.error('[checkout] error initiating credit purchase:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Checkout initiation failed' },
      { status: 500 }
    );
  }
}
