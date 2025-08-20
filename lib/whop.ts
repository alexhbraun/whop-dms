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

function parseSigHeader(headerSig: string): { raw: string; v1?: string; t?: string } {
  const raw = (headerSig || '').trim();
  const out: { raw: string; v1?: string; t?: string } = { raw };
  if (!raw) return out;
  const parts = raw.split(',').map(p => p.trim());
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (!k || v == null) continue;
    if (k === 't') out.t = v.trim();
    if (k === 'v1') out.v1 = v.trim();
    if (k === 'signature' || k === 'sig') out.v1 = v.trim();
  }
  if (!out.v1) {
    // sha256=xxx or last chunk after '='
    if (raw.startsWith('sha256=')) out.v1 = raw.slice(7).trim();
    else if (raw.includes('=')) out.v1 = raw.substring(raw.lastIndexOf('=') + 1).trim();
  }
  return out;
}

function computeDigests(secret: string, payload: string) {
  const h = crypto.createHmac('sha256', secret).update(payload, 'utf8');
  const hex = h.digest('hex');
  const hexUp = hex.toUpperCase();
  const b64 = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('base64');
  return { hex, hexUp, b64 };
}

export async function verifyWhopSignature(rawBody: string, headerSig: string, secret: string): Promise<boolean> {
  if (!secret || !headerSig) return false;
  const { v1, t } = parseSigHeader(headerSig);
  if (!v1) return false;

  // Try Stripe-style `${t}.${rawBody}` first if timestamp present
  if (t) {
    const tsPayload = `${t}.${rawBody}`;
    const ts = computeDigests(secret, tsPayload);
    if (timingSafeEq(v1, ts.hex) || timingSafeEq(v1, ts.hexUp) || timingSafeEq(v1, ts.b64)) return true;
  }

  // Fallback: raw body only
  const d = computeDigests(secret, rawBody);
  if (timingSafeEq(v1, d.hex) || timingSafeEq(v1, d.hexUp) || timingSafeEq(v1, d.b64)) return true;

  console.error('Sig mismatch', {
    hasT: !!t,
    v1Len: v1.length,
    v1Prefix: v1.slice(0, 8),
  });
  return false;
}
