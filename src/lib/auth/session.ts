import { cookies, headers } from 'next/headers';
import { verifyToken, type JWTPayload } from './jwt';
import { auth } from './better-auth';

/**
 * Unified session interface that works for both:
 * - JWT auth (email/password users)
 * - Better Auth (Google OAuth users)
 *
 * Note: For backward compatibility, `tenantId` is always a string.
 * For global users, it will be an empty string - use `isGlobalUser` to check.
 */
export interface UnifiedSession {
  userId: string;
  email: string;
  role: 'admin' | 'viewer';
  tenantId: string; // Empty string for global users (backward compat)
  isGlobalUser: boolean;
}

/**
 * Get the current session from either auth system
 *
 * Priority:
 * 1. Middleware-injected headers (fastest, already validated)
 * 2. JWT cookie (email/password users)
 * 3. Better Auth session (Google OAuth users)
 */
export async function getSession(): Promise<UnifiedSession | null> {
  // First check if middleware already validated and injected user info
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const tenantId = headerStore.get('x-tenant-id');
  const role = headerStore.get('x-user-role');
  const email = headerStore.get('x-user-email');
  const isGlobalUser = headerStore.get('x-is-global-user');

  if (userId && role && email) {
    return {
      userId,
      tenantId: tenantId || '', // Empty string for global users (backward compat)
      role: role as 'admin' | 'viewer',
      email,
      isGlobalUser: isGlobalUser === 'true',
    };
  }

  // Fallback to JWT cookie verification (email/password users)
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('access_token')?.value;

  if (accessToken) {
    const payload = await verifyToken(accessToken);
    if (payload) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId || '', // Empty string for global users (backward compat)
        isGlobalUser: payload.isGlobalUser || false,
      };
    }
  }

  // Fallback to Better Auth session (Google OAuth users)
  try {
    const betterAuthSession = await auth.api.getSession({
      headers: await headers(),
    });

    if (betterAuthSession?.user) {
      // Better Auth returns user with additional fields from the schema
      // The fields use the JS property names (camelCase) as defined in the schema
      const user = betterAuthSession.user as {
        id: string;
        email: string;
        role?: string;
        tenantId?: string | null;
        isGlobalUser?: boolean;
      };

      // For Better Auth users, check if they're global users
      // This handles both explicit isGlobalUser flag and null tenantId
      const isGlobalUser = user.isGlobalUser === true || user.tenantId === null || user.tenantId === undefined;

      return {
        userId: user.id,
        email: user.email,
        role: (user.role as 'admin' | 'viewer') || 'viewer',
        tenantId: user.tenantId || '', // Empty string for global users (backward compat)
        isGlobalUser,
      };
    }
  } catch {
    // Better Auth session not found or error
  }

  return null;
}

/**
 * Require authentication - throws if no valid session
 */
export async function requireAuth(): Promise<UnifiedSession> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Require a specific role - throws if insufficient permissions
 */
export async function requireRole(role: 'admin' | 'viewer'): Promise<UnifiedSession> {
  const session = await requireAuth();

  // Admin has all permissions
  if (session.role !== 'admin' && session.role !== role) {
    throw new Error('Forbidden');
  }

  return session;
}

/**
 * Set JWT auth cookies (for email/password login)
 */
export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies();

  cookieStore.set('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes
    path: '/',
  });

  cookieStore.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    path: '/',
  });
}

/**
 * Clear all auth cookies (both JWT and Better Auth)
 */
export async function clearAuthCookies() {
  const cookieStore = await cookies();
  // Clear JWT cookies
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  // Note: Better Auth session cookies are managed by Better Auth
}

// Re-export JWTPayload for backward compatibility
export type { JWTPayload };
