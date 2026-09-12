import { createAuthClient } from 'better-auth/react';

const appUrl =
  typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

export const isAuthConfigured =
  Boolean(process.env.NEXT_PUBLIC_AUTH_READY === 'true' || process.env.BETTER_AUTH_SECRET);

export const authClient = createAuthClient({
  baseURL: appUrl,
  fetchOptions: {
    credentials: 'include',
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
