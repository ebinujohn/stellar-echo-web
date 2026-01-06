import { createHash, createHmac, randomBytes } from 'crypto';

/**
 * HMAC-SHA256 Request Signing Utilities
 *
 * Shared utilities for signing requests to authenticated APIs
 * (Admin API, Text Chat API) using HMAC-SHA256 with nonce.
 */

/**
 * Generates a cryptographically secure random nonce.
 * Per ADMIN_API.md: minimum 16 characters, URL-safe.
 * Uses 24 random bytes encoded as base64url (32 characters).
 */
export function generateNonce(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Computes HMAC-SHA256 signature for API requests.
 *
 * Signature computation:
 * 1. body_hash = SHA256(request_body)
 * 2. message = timestamp + nonce + method + path + body_hash
 * 3. signature = HMAC-SHA256(api_key, message)
 *
 * @param apiKey - The API key to use for signing
 * @param timestamp - Unix timestamp in seconds
 * @param nonce - Random unique string (min 16 chars)
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path (e.g., /admin/cache/refresh)
 * @param body - Request body (empty string for GET requests)
 */
export function computeSignature(
  apiKey: string,
  timestamp: string,
  nonce: string,
  method: string,
  path: string,
  body: string
): string {
  // Compute SHA256 hash of the request body
  const bodyHash = createHash('sha256').update(body).digest('hex');

  // Build the message to sign (includes nonce for replay attack protection)
  const message = `${timestamp}${nonce}${method.toUpperCase()}${path}${bodyHash}`;

  // Compute HMAC-SHA256 signature
  return createHmac('sha256', apiKey).update(message).digest('hex');
}

/**
 * Generates signed request headers for API authentication.
 *
 * @param apiKey - The API key to use for signing
 * @param method - HTTP method
 * @param path - Request path
 * @param body - Request body (empty string for GET requests)
 * @returns Object with X-Timestamp, X-Nonce, and X-Signature headers
 */
export function generateSignedHeaders(
  apiKey: string,
  method: string,
  path: string,
  body: string
): { 'X-Timestamp': string; 'X-Nonce': string; 'X-Signature': string } {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = generateNonce();
  const signature = computeSignature(apiKey, timestamp, nonce, method, path, body);

  return {
    'X-Timestamp': timestamp,
    'X-Nonce': nonce,
    'X-Signature': signature,
  };
}
