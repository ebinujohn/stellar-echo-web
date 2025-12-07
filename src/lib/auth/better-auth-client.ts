'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client for React components
 *
 * Provides:
 * - signIn.social({ provider: 'google' }) for Google OAuth
 * - signOut() for logging out
 * - useSession() for checking session state
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// Export convenience methods
export const { signIn, signOut, useSession } = authClient;
