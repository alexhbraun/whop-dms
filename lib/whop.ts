import crypto from 'crypto';
import getRawBody from 'raw-body';
import type { NextApiRequest } from 'next';

export async function readRawBody(req: NextApiRequest): Promise<string> {
  const buf = await getRawBody(req);
  return buf.toString('utf8');
}

function timingSafeEq(a: string, b: string): boolean {
  try {
    const A = Buffer.from(a, 'utf8');
    const B = Buffer.from(b, 'utf8');
    if (A.length !== B.length) return false;
    return crypto.timingSafeEqual(A, B);
  } catch { return false; }
}

function extractSignature(headerSig: string): string {
  if (!headerSig) return '';
  const s = headerSig.trim();

  // 1) Comma-separated param list? e.g. "t=...,v1=abc" or "t=...,signature=abc"
  if (s.includes(',')) {
    const parts = s.split(',').map(p => p.trim());
    const getVal = (key: string) => parts.find(p => p.startsWith(key + '='))?.split('=')[1] ?? '';
    const fromV1  = getVal('v1');
    const fromSig = getVal('signature') || getVal('sig');
    if (fromV1)  return fromV1.trim();
    if (fromSig) return fromSig.trim();
    // Fallback: take last segment after '='
    const last = parts[parts.length - 1];
    if (last.includes('=')) return last.substring(last.indexOf('=') + 1).trim();
  }

  // 2) sha256=<hex>
  if (s.startsWith('sha256=')) return s.slice(7).trim();

  // 3) Otherwise, if it contains an '=', take the last chunk after '='
  if (s.includes('=')) return s.substring(s.lastIndexOf('=') + 1).trim();

  // 4) Raw signature value
  return s;
}

export async function verifyWhopSignature(rawBody: string, headerSig: string, secret: string): Promise<boolean> {
  if (!secret || !headerSig) return false;
  const received = extractSignature(headerSig);

  // Compute expected digests
  const hmac = crypto.createHmac('sha256', secret).update(rawBody, 'utf8');
  const expectHex = hmac.digest('hex');              // lowercase hex
  const expectHexUpper = expectHex.toUpperCase();    // uppercase hex
  const expectB64 = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');

  if (timingSafeEq(received, expectHex)) return true;
  if (timingSafeEq(received, expectHexUpper)) return true;
  if (timingSafeEq(received, expectB64)) return true;

  // Last resort: if header had sha256= prefix and we didn't strip, try again
  if (headerSig.startsWith('sha256=')) {
    const alt = headerSig.slice(7);
    if (timingSafeEq(alt, expectHex) || timingSafeEq(alt, expectHexUpper) || timingSafeEq(alt, expectB64)) return true;
  }

  // Safe diagnostic (no secrets)
  console.error('Sig mismatch', {
    headerLen: received.length,
    headerPrefix: received.slice(0, 8),
    expectHexPrefix: expectHex.slice(0, 8),
    expectB64Prefix: expectB64.slice(0, 8),
  });
  return false;
}
