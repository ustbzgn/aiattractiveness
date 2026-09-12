import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { creditOrder } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders/[orderId]/status
 *
 * Requirements:
 * 1. Requires authenticated user session.
 * 2. Scoped to the authenticated user (cross-user access blocked with 403/404).
 * 3. Returns order settlement status and credits granted.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required' },
      { status: 401 }
    );
  }

  const { orderId } = await context.params;
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId parameter' }, { status: 400 });
  }

  try {
    const orders = await db
      .select()
      .from(creditOrder)
      .where(
        and(
          eq(creditOrder.orderId, orderId),
          eq(creditOrder.userId, session.user.id)
        )
      )
      .limit(1);

    if (orders.length === 0) {
      // Check if order belongs to another user (for cross-user security test)
      const crossOrders = await db
        .select({ id: creditOrder.id })
        .from(creditOrder)
        .where(eq(creditOrder.orderId, orderId))
        .limit(1);

      if (crossOrders.length > 0) {
        return NextResponse.json(
          { error: 'Forbidden: Access denied to foreign order' },
          { status: 403 }
        );
      }

      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orders[0];
    return NextResponse.json({
      orderId: order.orderId,
      status: order.status,
      credits: order.credits,
      packId: order.packId,
      amountUsd: order.amountUsd,
      paidAt: order.paidAt,
    });
  } catch (err) {
    console.error('[order-status] error querying order status:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve order status' },
      { status: 500 }
    );
  }
}
