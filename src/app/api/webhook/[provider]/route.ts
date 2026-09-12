import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payment/waffo';
import { handleWebhookEvent } from '@/lib/payment/webhook-handler';

export const dynamic = 'force-dynamic';

/**
 * Unified webhook endpoint for payment providers (e.g., Waffo Pancake).
 * URL: /api/webhook/<provider> (e.g. /api/webhook/waffo)
 *
 * Response contract:
 * - 200 = processed / duplicate / ignored (stops provider retry)
 * - 400 = provider mismatch or missing config
 * - 401 = invalid signature
 * - 500 = unhandled execution error (prompts provider retry)
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  // Next 15/16: params is a Promise — must await
  const { provider } = await context.params;

  let payment;
  try {
    payment = getPaymentProvider();
  } catch (e) {
    console.error('[webhook] No payment provider configured:', e);
    return NextResponse.json({ error: 'Provider not configured' }, { status: 400 });
  }

  if (provider !== payment.name) {
    return NextResponse.json({ error: 'Provider mismatch' }, { status: 400 });
  }

  let event;
  try {
    // verifyWebhook reads request.text() internally and verifies RSA/signature
    event = await payment.verifyWebhook(request);
  } catch (e) {
    console.error('[webhook] Verification failed:', e);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    await handleWebhookEvent(event, payment.name);
  } catch (e) {
    console.error('[webhook] Handler failed:', e);
    return NextResponse.json({ error: 'Handler processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
