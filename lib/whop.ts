import crypto from 'crypto';

/**
 * Verify Whop HMAC signature against the exact raw request body.
 * - signature header may be plain hex or "sha256=<hex>"
 * - returns true if valid, false otherwise
 */
export function verifyWhopSignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!rawBody || !signature || !secret) return false;

  const givenHex = signature.replace(/^sha256=/, '').toLowerCase();

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    // timing-safe compare
    const a = Buffer.from(expectedHex, 'hex');
    const b = Buffer.from(givenHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
