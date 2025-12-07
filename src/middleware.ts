import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, refreshAccessToken } from '@/lib/auth/jwt';
import { getSessionCookie } from 'better-auth/cookies';

/**
 * Middleware that handles both authentication systems:
 * - JWT (email/password users)
 * - Better Auth (Google OAuth users)
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes - no auth required
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') // All auth routes (login, logout, Better Auth callbacks)
  ) {
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Check Better Auth session cookie
  const betterAuthSession = getSessionCookie(request);

  // No tokens at all - redirect to login
  if (!accessToken && !refreshToken && !betterAuthSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Handle JWT auth (email/password users)
  if (accessToken || refreshToken) {
    let payload = accessToken ? await verifyToken(accessToken) : null;
    let newAccessToken: string | null = null;

    // Access token invalid/expired - try to refresh
    if (!payload && refreshToken) {
      newAccessToken = await refreshAccessToken(refreshToken);
      if (newAccessToken) {
        payload = await verifyToken(newAccessToken);
      }
    }

    if (payload) {
      // Add user info to headers for server components
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId);
      requestHeaders.set('x-tenant-id', payload.tenantId || '');
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-user-email', payload.email);
      requestHeaders.set('x-is-global-user', String(payload.isGlobalUser || false));

      const response = NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Set the new access token cookie if we refreshed
      if (newAccessToken) {
        response.cookies.set('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 15, // 15 minutes
          path: '/',
        });
      }

      return response;
    }
  }

  // Handle Better Auth session (Google OAuth users)
  // If Better Auth session exists, let the request through
  // The session will be validated in getSession() on the server
  if (betterAuthSession) {
    return NextResponse.next();
  }

  // No valid auth - clear cookies and redirect to login
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('access_token');
  response.cookies.delete('refresh_token');
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
