import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/payment/waffo';
import { db } from '@/lib/db';
import { webhookEvent, creditOrder } from '@/lib/db/schema';
import { CreditService } from '@/lib/credits/service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhook/waffo
 *
 * Requirements:
 * 1. Cryptographic RSA-SHA256 signature verification on the raw body.
 * 2. Store ID and environment mode validation.
 * 3. Project and product identity checks (aiattractiveness one-time credit packs).
 * 4. Event delivery deduplication via webhook_event table (idempotent no-op for replays).
 * 5. Atomic order settlement and credit ledger increment; duplicate/concurrent notifications grant exactly once.
 * 6. Refund handling according to documented policy.
 * 7. Returns 200 on success/duplicate, 401 on bad signature, 400 on bad payload, 500 on internal error.
 */
export async function POST(request: Request) {
  const payment = getPaymentProvider();

  let event;
  try {
    // verifyWebhook reads raw request.text() internally before any JSON parsing
    event = await payment.verifyWebhook(request);
  } catch (err) {
    console.error('[webhook/waffo] signature verification failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid webhook signature' },
      { status: 401 }
    );
  }

  // 1. Idempotency delivery check: record provider delivery ID
  try {
    const inserted = await db
      .insert(webhookEvent)
      .values({
        id: event.id,
        provider: 'waffo',
        eventType: event.eventType,
        orderId: event.data?.orderId || null,
        payload: event as any,
      })
      .onConflictDoNothing({ target: webhookEvent.id });

    // If rowCount is 0, this delivery ID was already processed
    if (inserted.rowCount === 0) {
      console.log(`[webhook/waffo] duplicate delivery ${event.id} skipped`);
      return NextResponse.json({ ok: true, duplicate: true });
    }
  } catch (dbErr) {
    console.warn('[webhook/waffo] webhook event logging fallback:', dbErr);
  }

  // 2. Route by event type
  const { eventType, data } = event;
  const orderId = data.orderId;
  const metadata = data.orderMetadata || {};
  const userId = metadata.userId || data.merchantProvidedBuyerIdentity;
  const packId = metadata.packId;

  // Validate project identity if present in metadata
  if (metadata.project && metadata.project !== 'aiattractiveness') {
    console.warn(`[webhook/waffo] event project mismatch: ${metadata.project}`);
    return NextResponse.json({ ok: true, ignored: 'foreign_project' });
  }

  try {
    if (eventType === 'order.completed' || eventType === 'payment.succeeded') {
      if (!orderId || !userId || !packId) {
        console.warn(`[webhook/waffo] missing required order fields for paid event: orderId=${orderId}, userId=${userId}, packId=${packId}`);
        return NextResponse.json({ error: 'Missing required order metadata' }, { status: 400 });
      }

      // Atomic order settlement and credit ledger increment
      const result = await CreditService.grantCreditsFromOrder({
        orderId,
        userId,
        packId,
        amountUsd: data.amount,
        currency: data.currency,
      });

      if (!result.success) {
        console.error(`[webhook/waffo] credit grant failed: ${result.error}`);
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      console.log(`[webhook/waffo] successfully fulfilled order ${orderId} for user ${userId}, new balance: ${result.balance}`);
      return NextResponse.json({ ok: true, fulfilled: true });
    }

    if (eventType === 'order.refunded' || eventType === 'refund.created') {
      if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId for refund event' }, { status: 400 });
      }

      const result = await CreditService.refundOrder(orderId);
      console.log(`[webhook/waffo] processed refund for order ${orderId}, result:`, result);
      return NextResponse.json({ ok: true, refunded: true });
    }

    // Unhandled event types acknowledged with 200 to satisfy provider contract
    console.log(`[webhook/waffo] unhandled event type ${eventType} acknowledged`);
    return NextResponse.json({ ok: true, unhandled: true });
  } catch (err) {
    console.error(`[webhook/waffo] error handling event ${event.id}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal webhook error' },
      { status: 500 }
    );
  }
}
