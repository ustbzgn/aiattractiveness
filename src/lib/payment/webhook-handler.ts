import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getCreditPackageById } from '@/lib/credits/packages';
import { getOrCreateUserWallet } from '@/lib/credits/wallet';
import { CreditService } from '@/lib/credits/service';
import type { WebhookEventPayload } from '@/lib/payment';

/**
 * Unified webhook fulfillment for one-time credit pack purchases and refunds.
 * 1. Event deduplication via schema.webhookEvent (idempotent for provider retries).
 * 2. Project check (ignores foreign project events).
 * 3. Handles order.completed / payment.succeeded (with 4-scenario guest/email alignment)
 *    and order.refunded / refund.created.
 * 4. Always uses server-side pack.totalCredits (including bonus credits) inside a DB transaction.
 */
export async function handleWebhookEvent(
  event: WebhookEventPayload,
  providerName: string = 'waffo'
): Promise<void> {
  // 1. Idempotency: Record event delivery ID; duplicate deliveries no-op with early return (200 OK)
  const dedup = await db
    .insert(schema.webhookEvent)
    .values({
      id: event.id,
      provider: providerName,
      eventType: event.eventType,
      orderId: event.data?.orderId || null,
      payload: event as any,
    })
    .onConflictDoNothing({ target: schema.webhookEvent.id });

  if (dedup.rowCount === 0) {
    console.log(`[webhook] Duplicate event delivery received, skipping: ${event.id}`);
    return;
  }

  const metadata = event.data?.orderMetadata || {};
  const productMetadata = event.data?.productMetadata || {};

  // Ignore webhooks belonging to another project sharing the merchant account
  const allowedProjects = ['colorai', 'aiattractiveness'];
  if (metadata.project && !allowedProjects.includes(metadata.project)) {
    console.warn(`[webhook] Event project mismatch (${metadata.project}), ignoring: ${event.id}`);
    return;
  }

  const orderId = event.data?.orderId;
  if (!orderId) {
    console.warn(`[webhook] Missing orderId in event ${event.id}`);
    return;
  }

  // Handle refund events
  if (event.eventType === 'order.refunded' || event.eventType === 'refund.created') {
    const result = await CreditService.refundOrder(orderId);
    console.log(`[webhook] Processed refund for order ${orderId}:`, result);
    return;
  }

  // Handle completed payment events
  if (event.eventType !== 'order.completed' && event.eventType !== 'payment.succeeded') {
    console.log(`[webhook] Ignoring event type: ${event.eventType} (${event.id})`);
    return;
  }

  // 2. User Resolution & Email Binding (4 scenarios: member, returning member as guest, guest promotion, external):
  const directUserId = typeof metadata.userId === 'string' ? metadata.userId : null;
  const buyerIdentity = event.data?.merchantProvidedBuyerIdentity || null;
  const buyerEmail = (event.data?.buyerEmail || '').trim().toLowerCase() || null;

  let targetUserId: string | null = directUserId || buyerIdentity;

  if (buyerEmail) {
    const existingUserByEmail = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, buyerEmail))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      const canonicalUser = existingUserByEmail[0];
      if (targetUserId && targetUserId !== canonicalUser.id) {
        console.log(
          `[webhook] Aligning guest ${targetUserId} to existing account ${canonicalUser.id} for email ${buyerEmail}`
        );
        targetUserId = canonicalUser.id;
      } else if (!targetUserId) {
        targetUserId = canonicalUser.id;
      }
    } else if (targetUserId) {
      const currentUserRecord = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.id, targetUserId))
        .limit(1);

      if (currentUserRecord.length > 0 && currentUserRecord[0].email.endsWith('@guest.local')) {
        console.log(
          `[webhook] Promoting guest ${targetUserId} to permanent email: ${buyerEmail}`
        );
        await db
          .update(schema.user)
          .set({
            email: buyerEmail,
            name: buyerEmail.split('@')[0],
            updatedAt: new Date(),
          })
          .where(eq(schema.user.id, targetUserId));
      }
    } else {
      targetUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`[webhook] Creating new user ${targetUserId} for buyerEmail: ${buyerEmail}`);
      await db.insert(schema.user).values({
        id: targetUserId,
        name: buyerEmail.split('@')[0],
        email: buyerEmail,
        emailVerified: true,
      });
    }
  } else if (targetUserId) {
    const exists = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.id, targetUserId))
      .limit(1);
    if (exists.length === 0) targetUserId = null;
  }

  if (!targetUserId) {
    console.warn(
      `[webhook] No matching user found for event ${event.id} (userId=${directUserId}, buyerIdentity=${buyerIdentity}, email=${buyerEmail}) — skipping fulfillment.`
    );
    return;
  }

  // 3. Resolve Credit Package & Server-Controlled Credits (prefer pack.totalCredits so bonus credits are always included)
  const packId = (metadata.packId || productMetadata.packId || 'pack_1usd') as string;
  const pack = getCreditPackageById(packId);

  let creditsGranted = 0;
  if (pack) {
    creditsGranted = pack.totalCredits || pack.credits;
  } else if (metadata.credits) {
    creditsGranted = parseInt(metadata.credits, 10) || 0;
  }
  if (!creditsGranted) {
    creditsGranted = 40;
  }

  console.log(
    `[webhook] Fulfilling order ${orderId} for user ${targetUserId}: granting ${creditsGranted} credits (pack: ${packId})`
  );

  // 4. Ensure wallet exists (0 default balance) and atomically fulfill order + increment balance + append ledger
  await getOrCreateUserWallet(targetUserId, 0);

  await db.transaction(async (tx) => {
    const existingOrder = await tx
      .select()
      .from(schema.creditOrder)
      .where(eq(schema.creditOrder.orderId, orderId))
      .limit(1);

    if (existingOrder.length > 0 && existingOrder[0].status === 'paid') {
      console.log(`[webhook] Order ${orderId} already marked paid, skipping duplicate credit grant.`);
      return;
    }

    const [updatedWallet] = await tx
      .update(schema.creditWallet)
      .set({
        balance: sql`${schema.creditWallet.balance} + ${creditsGranted}`,
        lifetimeGranted: sql`${schema.creditWallet.lifetimeGranted} + ${creditsGranted}`,
        updatedAt: new Date(),
      })
      .where(eq(schema.creditWallet.userId, targetUserId))
      .returning();

    const ledgerId = `ldg_order_${orderId}_${Date.now()}`;

    await tx
      .insert(schema.creditLedger)
      .values({
        id: ledgerId,
        walletId: updatedWallet.id,
        userId: targetUserId,
        amount: creditsGranted,
        balanceAfter: updatedWallet.balance,
        type: 'pack_purchase',
        referenceId: orderId,
        notes: `One-time pack purchase fulfilled: ${pack?.name || packId} (${creditsGranted} credits)`,
        metadata: {
          orderId,
          packId,
          buyerEmail,
          amount: event.data.amount,
          currency: event.data.currency,
          deliveryEventId: event.id,
        },
      })
      .onConflictDoNothing();

    if (existingOrder.length > 0) {
      await tx
        .update(schema.creditOrder)
        .set({
          credits: creditsGranted,
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(schema.creditOrder.orderId, orderId));
    } else {
      await tx
        .insert(schema.creditOrder)
        .values({
          id: `ord_${orderId}`,
          orderId,
          userId: targetUserId,
          packId,
          credits: creditsGranted,
          amountUsd: event.data.amount || (pack ? pack.priceUsd.toFixed(2) : '1.90'),
          currency: event.data.currency || 'USD',
          status: 'paid',
          paidAt: new Date(),
        })
        .onConflictDoNothing();
    }

    console.log(
      `[webhook] Successfully fulfilled order ${orderId}. User ${targetUserId} balance is now ${updatedWallet.balance} credits.`
    );
  });
}
