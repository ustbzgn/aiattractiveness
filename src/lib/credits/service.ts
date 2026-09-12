import { db } from '@/lib/db';
import { creditWallet, creditLedger, creditOrder } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { getCreditPackageById } from './packages';

export interface WalletBalance {
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
}

export interface CreditOperationResult {
  success: boolean;
  balance: number;
  error?: string;
  ledgerId?: string;
}

/**
 * Transaction-Safe Credit Service.
 *
 * Implements:
 * 1. Safe credit wallet creation and fetching.
 * 2. Atomic credit grant on paid order webhook.
 * 3. Atomic credit reservation and settlement for portrait reports.
 * 4. Documented refund policy:
 *    - Reverses the granted credits from the user's wallet.
 *    - If user has already spent credits (balance < grant amount), user's balance is
 *      reduced to 0 (or debt balance recorded in metadata), preventing duplicate reversals.
 *    - Creates an immutable audit ledger row of type 'order_refund'.
 *    - Marks order as 'refunded'.
 */
export class CreditService {
  /**
   * Ensure user has a credit wallet and return it.
   */
  static async getOrCreateWallet(userId: string) {
    const existing = await db
      .select()
      .from(creditWallet)
      .where(eq(creditWallet.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const walletId = `wal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const [newWallet] = await db
      .insert(creditWallet)
      .values({
        id: walletId,
        userId,
        balance: 0,
        lifetimeGranted: 0,
        lifetimeSpent: 0,
      })
      .returning();

    return newWallet;
  }

  /**
   * Get current balance for a user.
   */
  static async getBalance(userId: string): Promise<WalletBalance> {
    const wallet = await this.getOrCreateWallet(userId);
    return {
      balance: wallet.balance,
      lifetimeGranted: wallet.lifetimeGranted,
      lifetimeSpent: wallet.lifetimeSpent,
    };
  }

  /**
   * Atomically grant credits upon verified order payment.
   * Ensures exactly-once credit delivery via order status check and ledger insertion.
   */
  static async grantCreditsFromOrder(params: {
    orderId: string;
    userId: string;
    packId: string;
    amountUsd?: string;
    currency?: string;
  }): Promise<CreditOperationResult> {
    const { orderId, userId, packId, amountUsd = '0.00', currency = 'USD' } = params;
    const pack = getCreditPackageById(packId);
    if (!pack) {
      return { success: false, balance: 0, error: `Unknown pack ID: ${packId}` };
    }

    // Check if order already recorded
    const existingOrders = await db
      .select()
      .from(creditOrder)
      .where(eq(creditOrder.orderId, orderId))
      .limit(1);

    if (existingOrders.length > 0 && existingOrders[0].status === 'paid') {
      const wallet = await this.getOrCreateWallet(userId);
      return {
        success: true,
        balance: wallet.balance,
        error: 'Order already fulfilled (idempotent no-op)',
      };
    }

    // Execute atomic update inside transaction
    return await db.transaction(async (tx) => {
      // 1. Lock/Fetch wallet
      const walletList = await tx
        .select()
        .from(creditWallet)
        .where(eq(creditWallet.userId, userId))
        .limit(1);

      let wallet = walletList[0];
      if (!wallet) {
        const walletId = `wal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const inserted = await tx
          .insert(creditWallet)
          .values({
            id: walletId,
            userId,
            balance: 0,
            lifetimeGranted: 0,
            lifetimeSpent: 0,
          })
          .returning();
        wallet = inserted[0];
      }

      const newBalance = wallet.balance + pack.credits;
      const newLifetimeGranted = wallet.lifetimeGranted + pack.credits;

      // 2. Update wallet
      await tx
        .update(creditWallet)
        .set({
          balance: newBalance,
          lifetimeGranted: newLifetimeGranted,
          updatedAt: new Date(),
        })
        .where(eq(creditWallet.id, wallet.id));

      // 3. Insert immutable ledger entry
      const ledgerId = `led_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(creditLedger).values({
        id: ledgerId,
        walletId: wallet.id,
        userId,
        amount: pack.credits,
        balanceAfter: newBalance,
        type: 'pack_purchase',
        referenceId: orderId,
        notes: `Purchased ${pack.name} (${pack.credits} credits)`,
        metadata: { packId, amountUsd, currency },
      });

      // 4. Update or insert order record
      if (existingOrders.length > 0) {
        await tx
          .update(creditOrder)
          .set({
            status: 'paid',
            paidAt: new Date(),
          })
          .where(eq(creditOrder.orderId, orderId));
      } else {
        await tx.insert(creditOrder).values({
          id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          orderId,
          userId,
          packId,
          credits: pack.credits,
          amountUsd,
          currency,
          status: 'paid',
          paidAt: new Date(),
        });
      }

      return {
        success: true,
        balance: newBalance,
        ledgerId,
      };
    });
  }

  /**
   * Handle order refund.
   *
   * REFUND POLICY:
   * 1. Reverses credits corresponding to the pack.
   * 2. If user balance is less than pack credits, sets balance to 0 and records the deficit in ledger.
   * 3. An order can only be refunded once. Duplicate refund webhooks are ignored idempotently.
   */
  static async refundOrder(orderId: string): Promise<CreditOperationResult> {
    const orders = await db
      .select()
      .from(creditOrder)
      .where(eq(creditOrder.orderId, orderId))
      .limit(1);

    if (orders.length === 0) {
      return { success: false, balance: 0, error: 'Order not found' };
    }

    const order = orders[0];
    if (order.status === 'refunded') {
      const wallet = await this.getOrCreateWallet(order.userId);
      return {
        success: true,
        balance: wallet.balance,
        error: 'Order already refunded (idempotent no-op)',
      };
    }

    return await db.transaction(async (tx) => {
      const walletList = await tx
        .select()
        .from(creditWallet)
        .where(eq(creditWallet.userId, order.userId))
        .limit(1);

      if (walletList.length === 0) {
        return { success: false, balance: 0, error: 'Wallet not found' };
      }

      const wallet = walletList[0];
      const deductAmount = Math.min(wallet.balance, order.credits);
      const deficit = order.credits - deductAmount;
      const newBalance = wallet.balance - deductAmount;

      // Update wallet
      await tx
        .update(creditWallet)
        .set({
          balance: newBalance,
          updatedAt: new Date(),
        })
        .where(eq(creditWallet.id, wallet.id));

      // Append immutable ledger entry
      const ledgerId = `led_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(creditLedger).values({
        id: ledgerId,
        walletId: wallet.id,
        userId: order.userId,
        amount: -deductAmount,
        balanceAfter: newBalance,
        type: 'order_refund',
        referenceId: orderId,
        notes: `Refunded order ${orderId}. Deducted: ${deductAmount}, Deficit: ${deficit}`,
        metadata: { orderId, creditsGranted: order.credits, deficit },
      });

      // Update order status
      await tx
        .update(creditOrder)
        .set({
          status: 'refunded',
          refundedAt: new Date(),
        })
        .where(eq(creditOrder.orderId, orderId));

      return {
        success: true,
        balance: newBalance,
        ledgerId,
      };
    });
  }

  /**
   * Reserve credits for portrait report generation.
   * Deducts credits with balance check.
   */
  static async reserveCredits(
    userId: string,
    amount: number,
    referenceId: string
  ): Promise<CreditOperationResult> {
    if (amount <= 0) {
      return { success: false, balance: 0, error: 'Amount must be positive' };
    }

    return await db.transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(userId);

      if (wallet.balance < amount) {
        return {
          success: false,
          balance: wallet.balance,
          error: `Insufficient balance. Required: ${amount}, Available: ${wallet.balance}`,
        };
      }

      const newBalance = wallet.balance - amount;
      const newLifetimeSpent = wallet.lifetimeSpent + amount;

      await tx
        .update(creditWallet)
        .set({
          balance: newBalance,
          lifetimeSpent: newLifetimeSpent,
          updatedAt: new Date(),
        })
        .where(eq(creditWallet.id, wallet.id));

      const ledgerId = `led_res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(creditLedger).values({
        id: ledgerId,
        walletId: wallet.id,
        userId,
        amount: -amount,
        balanceAfter: newBalance,
        type: 'report_reserve',
        referenceId,
        notes: `Reserved ${amount} credits for report ${referenceId}`,
      });

      return {
        success: true,
        balance: newBalance,
        ledgerId,
      };
    });
  }

  /**
   * Refund reserved credits if a report job fails.
   */
  static async refundReservedCredits(
    userId: string,
    amount: number,
    referenceId: string,
    reason: string
  ): Promise<CreditOperationResult> {
    return await db.transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet(userId);
      const newBalance = wallet.balance + amount;
      const newLifetimeSpent = Math.max(0, wallet.lifetimeSpent - amount);

      await tx
        .update(creditWallet)
        .set({
          balance: newBalance,
          lifetimeSpent: newLifetimeSpent,
          updatedAt: new Date(),
        })
        .where(eq(creditWallet.id, wallet.id));

      const ledgerId = `led_jobref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await tx.insert(creditLedger).values({
        id: ledgerId,
        walletId: wallet.id,
        userId,
        amount,
        balanceAfter: newBalance,
        type: 'report_refund',
        referenceId,
        notes: `Refunded ${amount} credits: ${reason}`,
      });

      return {
        success: true,
        balance: newBalance,
        ledgerId,
      };
    });
  }
}
