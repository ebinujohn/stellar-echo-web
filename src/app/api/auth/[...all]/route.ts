import { auth } from '@/lib/auth/better-auth';
import { toNextJsHandler } from 'better-auth/next-js';

/**
 * Better Auth catch-all API route handler
 *
 * Handles all Better Auth endpoints including:
 * - /api/auth/signin/google - Google OAuth initiation
 * - /api/auth/callback/google - Google OAuth callback
 * - /api/auth/signout - Sign out
 * - /api/auth/session - Get current session
 */
export const { GET, POST } = toNextJsHandler(auth);
