import { cookies, headers } from 'next/headers';
import { verifyToken, type JWTPayload } from './jwt';

export async function getSession(): Promise<JWTPayload | null> {
  // First check if middleware already validated and injected user info
  // This handles the race condition where middleware refreshed the token
  // but the cookie hasn't been updated yet in the current request
  const headerStore = await headers();
  const userId = headerStore.get('x-user-id');
  const tenantId = headerStore.get('x-tenant-id');
  const role = headerStore.get('x-user-role');
  const email = headerStore.get('x-user-email');

  if (userId && tenantId && role && email) {
    return {
      userId,
      tenantId,
      role: role as 'admin' | 'viewer',
      email,
    };
  }

  // Fallback to cookie verification for non-middleware routes
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireAuth(): Promise<JWTPayload> {
  const session = await getSession();

  if (!session) {
    throw new Error('Unauthorized');
  }

  return session;
}

export async function requireRole(role: 'admin' | 'viewer'): Promise<JWTPayload> {
  const session = await requireAuth();

  if (session.role !== 'admin' && session.role !== role) {
    throw new Error('Forbidden');
  }

  return session;
}

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

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
}
