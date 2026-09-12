import { eq, sql } from 'drizzle-orm';
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
 * Ensures user has a credit wallet. If not, creates one and grants 20 free starter credits.
 */
export async function getOrCreateUserWallet(userId: string) {
  const existing = await db
    .select()
    .from(schema.creditWallet)
    .where(eq(schema.creditWallet.userId, userId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const walletId = `wlt_${userId}`;
  const starterCredits = 20; // 20 starter credits (equivalent to $1.00, allows 2 fast tests)

  await db
    .insert(schema.creditWallet)
    .values({
      id: walletId,
      userId,
      balance: starterCredits,
      lifetimeGranted: starterCredits,
      lifetimeSpent: 0,
    })
    .onConflictDoNothing();

  // Create initial complimentary ledger record
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
      notes: 'Welcome gift: 20 complimentary starter credits upon registration',
    })
    .onConflictDoNothing();

  const fresh = await db
    .select()
    .from(schema.creditWallet)
    .where(eq(schema.creditWallet.userId, userId))
    .limit(1);

  return (
    fresh[0] || {
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
 * Atomically debits credits from user's wallet with ledger audit record.
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

  const wallet = await getOrCreateUserWallet(userId);

  if (wallet.balance < amount) {
    throw new InsufficientCreditsError(wallet.balance, amount);
  }

  const transactionId = `ldg_deduct_${userId}_${Date.now()}`;
  const newBalance = wallet.balance - amount;

  // Atomic update wallet balance
  await db
    .update(schema.creditWallet)
    .set({
      balance: sql`${schema.creditWallet.balance} - ${amount}`,
      lifetimeSpent: sql`${schema.creditWallet.lifetimeSpent} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.creditWallet.userId, userId));

  // Insert ledger record
  await db.insert(schema.creditLedger).values({
    id: transactionId,
    walletId: wallet.id,
    userId,
    amount: -amount,
    balanceAfter: newBalance,
    type: 'report_settle',
    referenceId,
    notes,
    metadata: { timestamp: new Date().toISOString(), fee: amount },
  });

  return {
    success: true,
    balanceRemaining: newBalance,
    transactionId,
  };
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

  const wallet = await getOrCreateUserWallet(userId);
  const refundId = `ldg_refund_${userId}_${Date.now()}`;
  const restoredBalance = wallet.balance + amount;

  await db
    .update(schema.creditWallet)
    .set({
      balance: sql`${schema.creditWallet.balance} + ${amount}`,
      lifetimeSpent: sql`${schema.creditWallet.lifetimeSpent} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(schema.creditWallet.userId, userId));

  await db.insert(schema.creditLedger).values({
    id: refundId,
    walletId: wallet.id,
    userId,
    amount,
    balanceAfter: restoredBalance,
    type: 'report_refund',
    referenceId,
    notes: reason,
    metadata: { refundedAt: new Date().toISOString() },
  });

  return { success: true, newBalance: restoredBalance };
}
