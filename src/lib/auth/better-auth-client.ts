'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client for React components
 *
 * Provides:
 * - signIn.social({ provider: 'google' }) for Google OAuth
 * - signOut() for logging out
 * - useSession() for checking session state
 *
 * Uses window.location.origin as baseURL to ensure OAuth works correctly
 * regardless of which domain the app is accessed from (localhost, ngrok, production).
 * This avoids issues with NEXT_PUBLIC_* variables being baked in at build time.
 */
export const authClient = createAuthClient({
  baseURL: typeof window !== 'undefined' ? window.location.origin : '',
});

// Export convenience methods
export const { signIn, signOut, useSession } = authClient;
