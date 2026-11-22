import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';

export class InsufficientCreditsError extends Error {
  currentBalance: number;
  requiredAmount: number;

  constructor(currentBalance: number, requiredAmount: number) {
    super(`Insufficient credits: requires ${requiredAmount}, but wallet has ${currentBalance}`);
    this.name = 'InsufficientCreditsError';
    this.currentBalance = currentBalance;
    this.requiredAmount = requiredAmount;
  }
}

/**
 * Fetches an existing wallet without creating one.
 */
export async function getUserWallet(userId: string) {
  const existing = await db
    .select()
    .from(schema.creditWallet)
    .where(eq(schema.creditWallet.userId, userId))
    .limit(1);

  return existing[0] ?? null;
}

/**
 * Ensures user has a credit wallet. Defaults to 0 initial credits
 * (registered user welcome bonus is granted exclusively via Better Auth user.create hook).
 */
export async function getOrCreateUserWallet(userId: string, initialCredits: number = 0) {
  const existing = await getUserWallet(userId);
  if (existing) {
    return existing;
  }

  const walletId = `wlt_${userId}`;
  const starterCredits = Math.max(0, Math.floor(initialCredits));

  const inserted = await db
    .insert(schema.creditWallet)
    .values({
      id: walletId,
      userId,
      balance: starterCredits,
      lifetimeGranted: starterCredits,
      lifetimeSpent: 0,
    })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0 && starterCredits > 0) {
    await db
      .insert(schema.creditLedger)
      .values({
        id: `ldg_init_${userId}_${Date.now()}`,
        walletId,
        userId,
        amount: starterCredits,
        balanceAfter: starterCredits,
        type: 'pack_purchase',
        referenceId: 'welcome_gift_starter_credits',
        notes: `Welcome gift: ${starterCredits} complimentary starter credits`,
      })
      .onConflictDoNothing();
  }

  const fresh = await getUserWallet(userId);
  return (
    fresh || {
      id: walletId,
      userId,
      balance: starterCredits,
      lifetimeGranted: starterCredits,
      lifetimeSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
}

/**
 * Atomically debits credits from user's wallet with conditional balance check and ledger audit record.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  referenceId: string,
  notes: string = 'Portrait analysis fee'
): Promise<{ success: boolean; balanceRemaining: number; transactionId: string }> {
  if (amount <= 0) {
    throw new Error('Deduction amount must be positive');
  }

  return await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.creditWallet)
      .set({
        balance: sql`${schema.creditWallet.balance} - ${amount}`,
        lifetimeSpent: sql`${schema.creditWallet.lifetimeSpent} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.creditWallet.userId, userId),
          gte(schema.creditWallet.balance, amount)
        )
      )
      .returning();

    if (updated.length === 0) {
      const existing = await tx
        .select({ balance: schema.creditWallet.balance })
        .from(schema.creditWallet)
        .where(eq(schema.creditWallet.userId, userId))
        .limit(1);
      throw new InsufficientCreditsError(existing[0]?.balance ?? 0, amount);
    }

    const wallet = updated[0];
    const transactionId = `ldg_deduct_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await tx.insert(schema.creditLedger).values({
      id: transactionId,
      walletId: wallet.id,
      userId,
      amount: -amount,
      balanceAfter: wallet.balance,
      type: 'report_settle',
      referenceId,
      notes,
      metadata: { timestamp: new Date().toISOString(), fee: amount },
    });

    return {
      success: true,
      balanceRemaining: wallet.balance,
      transactionId,
    };
  });
}

/**
 * Refunds credits in case of AI service failure or downstream error.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  referenceId: string,
  reason: string = 'Analysis service failure refund'
): Promise<{ success: boolean; newBalance: number }> {
  if (amount <= 0) return { success: true, newBalance: 0 };

  return await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.creditWallet)
      .set({
        balance: sql`${schema.creditWallet.balance} + ${amount}`,
        lifetimeSpent: sql`GREATEST(0, ${schema.creditWallet.lifetimeSpent} - ${amount})`,
        updatedAt: new Date(),
      })
      .where(eq(schema.creditWallet.userId, userId))
      .returning();

    if (updated.length === 0) {
      return { success: false, newBalance: 0 };
    }

    const wallet = updated[0];
    const refundId = `ldg_refund_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await tx.insert(schema.creditLedger).values({
      id: refundId,
      walletId: wallet.id,
      userId,
      amount,
      balanceAfter: wallet.balance,
      type: 'report_refund',
      referenceId,
      notes: reason,
      metadata: { refundedAt: new Date().toISOString() },
    });

    return { success: true, newBalance: wallet.balance };
  });
}
