import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Route handler for Better Auth endpoints:
 * /api/auth/sign-in/email
 * /api/auth/sign-up/email
 * /api/auth/sign-out
 * /api/auth/get-session
 */
export const { GET, POST } = toNextJsHandler(auth);
