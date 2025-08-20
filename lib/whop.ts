import crypto from 'crypto';
import getRawBody from 'raw-body';
import type { NextApiRequest } from 'next';

export async function readRawBody(req: NextApiRequest): Promise<string> {
  const buf = await getRawBody(req);
  return buf.toString('utf8');
}

// rawBody must be the EXACT raw JSON string bytes
export async function verifyWhopSignature(rawBody: string, headerSig: string, secret: string): Promise<boolean> {
  if (!secret || !headerSig) return false;

  const normalize = (s: string) => (s || '').trim();
  const extract = (sig: string) => {
    // Strip common prefixes or param lists: "sha256=abc", "t=...,v1=abc"
    const val = sig.includes('v1=')
      ? sig.split(',').map(p => p.trim()).find(p => p.startsWith('v1='))?.slice(3)
      : sig.startsWith('sha256=') ? sig.slice(7) : sig;
    return normalize(val || sig);
  };

  const received = extract(headerSig);

  // Compute both hex and base64
  const h = crypto.createHmac('sha256', secret).update(rawBody, 'utf8');
  const expectHex = h.digest('hex'); // lowercase hex
  const expectHexUpper = expectHex.toUpperCase();
  const expectB64 = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

  // Constant-time compare helpers
  const safeEq = (a: string, b: string) => {
    try {
      const ba = Buffer.from(a);
      const bb = Buffer.from(b);
      if (ba.length !== bb.length) return false;
      return crypto.timingSafeEqual(ba, bb);
    } catch { return false; }
  };

  // Try exact hex, uppercase hex, or base64
  if (safeEq(received, expectHex)) return true;
  if (safeEq(received, expectHexUpper)) return true;
  if (safeEq(received, expectB64)) return true;

  // Last resort: if header had sha256= prefix and we didn't strip, try again
  if (headerSig.startsWith('sha256=')) {
    const alt = headerSig.slice(7);
    if (safeEq(alt, expectHex) || safeEq(alt, expectHexUpper) || safeEq(alt, expectB64)) return true;
  }

  // Safe diagnostic (no secrets)
  console.error('Webhook signature mismatch', {
    headerLen: received.length,
    headerPrefix: received.slice(0, 8),
    expectHexPrefix: expectHex.slice(0, 8),
    expectB64Prefix: expectB64.slice(0, 8),
  });
  return false;
}
