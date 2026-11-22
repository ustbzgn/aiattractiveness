import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { getOrCreateUserWallet } from '@/lib/credits/wallet';

export const GUEST_COOKIE_NAME = 'colorai_guest_id';
export const GUEST_COOKIE_MAX_AGE = 2 * 365 * 24 * 60 * 60; // 2 years in seconds (63,072,000s)
const GUEST_ID_PATTERN = /^gst_[a-zA-Z0-9_-]{6,64}$/;

/**
 * Read-only identity resolver: returns authenticated userId or existing guest cookie userId.
 * Never creates database rows for anonymous visitors without a cookie.
 */
export async function resolveCurrentUserId(
  sessionUserId?: string | null,
  cookieStore?: Awaited<ReturnType<typeof cookies>>
): Promise<{ userId: string | null; isGuest: boolean; guestId: string | null }> {
  if (sessionUserId) {
    return { userId: sessionUserId, isGuest: false, guestId: null };
  }

  const resolvedCookies = cookieStore || (await cookies());
  const rawGuestId = resolvedCookies.get(GUEST_COOKIE_NAME)?.value || null;
  const guestId = rawGuestId && GUEST_ID_PATTERN.test(rawGuestId) ? rawGuestId : null;

  if (!guestId) {
    return { userId: null, isGuest: true, guestId: null };
  }

  return {
    userId: `user_${guestId}`,
    isGuest: true,
    guestId,
  };
}

/**
 * Resolves current user ID from session or guest cookie (2-year lifespan).
 * Used when initiating checkout: creates a guest user and a zero-balance wallet if needed.
 */
export async function getOrCreateCurrentUserId(
  sessionUserId?: string | null,
  cookieStore?: Awaited<ReturnType<typeof cookies>>
): Promise<{ userId: string; isGuest: boolean; guestId: string | null }> {
  if (sessionUserId) {
    return { userId: sessionUserId, isGuest: false, guestId: null };
  }

  const resolvedCookies = cookieStore || (await cookies());
  const rawGuestId = resolvedCookies.get(GUEST_COOKIE_NAME)?.value || null;
  let guestId = rawGuestId && GUEST_ID_PATTERN.test(rawGuestId) ? rawGuestId : null;

  if (!guestId) {
    guestId = `gst_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  const targetUserId = `user_${guestId}`;

  // Check if guest user record already exists
  const existingUser = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.id, targetUserId))
    .limit(1);

  if (existingUser.length === 0) {
    try {
      await db.insert(schema.user).values({
        id: targetUserId,
        name: 'Guest User',
        email: `${guestId}@guest.local`,
        emailVerified: false,
      });
      // Initialize zero-balance wallet for guest (no free starter credits)
      await getOrCreateUserWallet(targetUserId, 0);
    } catch (err) {
      console.warn('[guest] user create deferred or duplicate:', err);
    }
  }

  return {
    userId: targetUserId,
    isGuest: true,
    guestId,
  };
}
