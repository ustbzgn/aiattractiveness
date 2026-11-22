/**
 * ColorAI Portal Core — Server Facade
 *
 * Feature API routes and services under src/features/<app>/ should import shared
 * platform capabilities from '@/core/server' rather than coupling to internal lib paths.
 */
export { auth } from '@/lib/auth';
export {
  resolveCurrentUserId,
  getOrCreateCurrentUserId,
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_MAX_AGE,
} from '@/lib/auth/guest';
export {
  deductCredits,
  refundCredits,
  getUserWallet,
  getOrCreateUserWallet,
  InsufficientCreditsError,
} from '@/lib/credits/wallet';
export { db } from '@/lib/db';
export { reportJob } from '@/lib/db/schema';
export { generateImage, getToApisConfig } from '@/lib/ai/image-generation';
export { normalizePortraitImage } from './image';
export type { NormalizedImageResult } from './image';
export { APP_CONFIG, CREDIT_PACKAGES } from '@/lib/config';
