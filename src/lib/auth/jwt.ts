import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback_secret_please_change_in_env'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'viewer';
  tenantId: string | null; // Nullable for global users
  isGlobalUser?: boolean; // Cross-tenant access flag
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn = '15m'): Promise<string> {
  return new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const payload = await verifyToken(refreshToken);

  if (!payload) {
    return null;
  }

  // Create new access token
  return signToken({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
  }, '15m');
}
