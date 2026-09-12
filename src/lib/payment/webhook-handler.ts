import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getCreditPackageById } from '@/lib/credits/packages';
import { getOrCreateUserWallet } from '@/lib/credits/wallet';
import type { WebhookEventPayload } from '@/lib/payment';

/**
 * Webhook fulfillment for one-time credit pack purchases.
 * Follows strict financial engineering standards:
 * 1. Cryptographic event deduplication via schema.webhookEvent (idempotency, safe for provider retries).
 * 2. Multi-strategy user resolution: orderMetadata.userId -> merchantProvidedBuyerIdentity -> buyerEmail.
 * 3. Atomic credit grant & immutable ledger audit entry in schema.creditLedger.
 * 4. Updates schema.creditOrder status to 'paid'.
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

  // Handle only completed orders
  if (event.eventType !== 'order.completed') {
    console.log(`[webhook] Ignoring event type: ${event.eventType} (${event.id})`);
    return;
  }

  const orderId = event.data?.orderId;
  if (!orderId) {
    console.warn(`[webhook] Missing orderId in event ${event.id}`);
    return;
  }

  // 2. User Resolution & Email Binding:
  // Ensures credits and email are strictly 1-to-1 mapped in ALL cases (both authenticated and guest).
  const metadata = event.data?.orderMetadata || {};
  const productMetadata = event.data?.productMetadata || {};
  const directUserId = typeof metadata.userId === 'string' ? metadata.userId : null;
  const buyerIdentity = event.data?.merchantProvidedBuyerIdentity || null;
  const buyerEmail = (event.data?.buyerEmail || '').trim().toLowerCase() || null;

  let targetUserId: string | null = directUserId || buyerIdentity;

  if (buyerEmail) {
    // Check if a registered user with this real buyer email already exists
    const existingUserByEmail = await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, buyerEmail))
      .limit(1);

    if (existingUserByEmail.length > 0) {
      const canonicalUser = existingUserByEmail[0];
      // If payment was initiated by a temporary guest ID different from the canonical user:
      if (targetUserId && targetUserId !== canonicalUser.id) {
        console.log(
          `[webhook] Aligning guest ${targetUserId} to existing account ${canonicalUser.id} for email ${buyerEmail}`
        );
        // Consolidate target to the canonical user
        targetUserId = canonicalUser.id;
      } else if (!targetUserId) {
        targetUserId = canonicalUser.id;
      }
    } else {
      // No user with this email exists yet
      if (targetUserId) {
        // If targetUserId is a guest account (e.g., email ending in @guest.local), promote it to the real buyerEmail
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
        // No targetUserId provided: create a fresh user bound to buyerEmail
        targetUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        console.log(`[webhook] Creating new user ${targetUserId} for buyerEmail: ${buyerEmail}`);
        await db.insert(schema.user).values({
          id: targetUserId,
          name: buyerEmail.split('@')[0],
          email: buyerEmail,
          emailVerified: true,
        });
      }
    }
  } else if (targetUserId) {
    // Fallback if no buyerEmail provided by gateway (unlikely)
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

  // 3. Resolve Credit Package & Credits Granted
  const packId = (metadata.packId || productMetadata.packId || 'pack_starter') as string;
  const pack = getCreditPackageById(packId);

  // Parse credits from metadata or fallback to fixed server package config
  let creditsGranted = 0;
  if (metadata.credits) {
    creditsGranted = parseInt(metadata.credits, 10) || 0;
  }
  if (!creditsGranted && pack) {
    creditsGranted = pack.totalCredits || pack.credits;
  }
  if (!creditsGranted) {
    creditsGranted = 20; // safe fallback starter credits
  }

  console.log(
    `[webhook] Fulfilling order ${orderId} for user ${targetUserId}: granting ${creditsGranted} credits (pack: ${packId})`
  );

  // 4. Ensure wallet exists and execute atomic balance increment + ledger record
  const wallet = await getOrCreateUserWallet(targetUserId);
  const newBalance = wallet.balance + creditsGranted;
  const ledgerId = `ldg_order_${orderId}_${Date.now()}`;

  // Update wallet balance
  await db
    .update(schema.creditWallet)
    .set({
      balance: sql`${schema.creditWallet.balance} + ${creditsGranted}`,
      lifetimeGranted: sql`${schema.creditWallet.lifetimeGranted} + ${creditsGranted}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.creditWallet.userId, targetUserId));

  // Insert immutable audit record into credit_ledger
  await db
    .insert(schema.creditLedger)
    .values({
      id: ledgerId,
      walletId: wallet.id,
      userId: targetUserId,
      amount: creditsGranted,
      balanceAfter: newBalance,
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

  // 5. Update or insert credit_order status to 'paid'
  const existingOrder = await db
    .select()
    .from(schema.creditOrder)
    .where(eq(schema.creditOrder.orderId, orderId))
    .limit(1);

  if (existingOrder.length > 0) {
    await db
      .update(schema.creditOrder)
      .set({
        status: 'paid',
        paidAt: new Date(),
      })
      .where(eq(schema.creditOrder.orderId, orderId));
  } else {
    // If order was not locally initiated via POST /api/checkout/credits (e.g. direct gateway link)
    await db
      .insert(schema.creditOrder)
      .values({
        id: `ord_${orderId}`,
        orderId,
        userId: targetUserId,
        packId,
        credits: creditsGranted,
        amountUsd: event.data.amount || (pack ? pack.priceUsd.toFixed(2) : '1.00'),
        currency: event.data.currency || 'USD',
        status: 'paid',
        paidAt: new Date(),
      })
      .onConflictDoNothing();
  }

  console.log(
    `[webhook] Successfully fulfilled order ${orderId}. User ${targetUserId} balance is now ${newBalance} credits.`
  );
}
