import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from './db';
import * as schema from './db/schema';

/**
 * Better Auth configuration for aiattractiveness.
 *
 * Requirements met:
 * 1. Independent cookie prefix: 'aiattractiveness.'
 * 2. Independent secret from BETTER_AUTH_SECRET with fallback for local preview.
 * 3. Base URL / trusted origins from env callback origin.
 * 4. Explicit missing-config behavior (never crash module evaluation during static build).
 * 5. Strictly uses aiattractiveness isolated schema via drizzleAdapter.
 */

const authSecret =
  process.env.BETTER_AUTH_SECRET || 'aat_auth_local_development_secret_key_2026_fallback';

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3002';

export const isAuthSecretConfigured = Boolean(process.env.BETTER_AUTH_SECRET);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL,
  secret: authSecret,
  advanced: {
    // Independent cookie prefix ensuring zero collision with other projects
    cookiePrefix: 'aiattractiveness',
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  trustedOrigins: [
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://192.168.*:*',
    'http://10.*:*',
    'http://172.*:*',
    process.env.NEXT_PUBLIC_APP_URL || '',
    process.env.BETTER_AUTH_URL || '',
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          try {
            // Automatically initialize a credit wallet with 20 complimentary credits for new users (worth $1.00, allows 2 fast tests)
            await db.insert(schema.creditWallet).values({
              id: `wlt_${createdUser.id}`,
              userId: createdUser.id,
              balance: 20,
              lifetimeGranted: 20,
              lifetimeSpent: 0,
            }).onConflictDoNothing();
          } catch (err) {
            console.error('[Auth Hook] Failed to initialize credit wallet for user:', createdUser.id, err);
          }
        },
      },
    },
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  },
});

export type Auth = typeof auth;
