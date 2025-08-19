// lib/token.ts
import crypto from 'crypto';

export interface TokenPayload {
  sub: string;
  [k: string]: unknown;
}

const SECRET = (process.env.WHOP_WEBHOOK_SECRET ?? 'dev-secret') as string;

// url-safe base64
const b64u = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '*').replace(/=+$/g, '');
const unb64u = (str: string) =>
  Buffer.from(str.replace(/-/g, '+').replace(/\*/g, '/'), 'base64');

const signHmac = (msg: string) =>
  b64u(crypto.createHmac('sha256', SECRET).update(msg).digest());

function msFromExpiresIn(expiresIn: string): number {
  if (!expiresIn) return 3600_000;
  const m = expiresIn.match(/^(\d+)([smhd])$/); // seconds/minutes/hours/days
  if (!m) return Number(expiresIn) * 1000 || 3600_000;
  const n = Number(m[1]);
  return { s: n * 1000, m: n * 60_000, h: n * 3_600_000, d: n * 86_400_000 }[m[2] as 's'|'m'|'h'|'d'];
}

export function signToken(payload: TokenPayload, expiresIn: string = '1h'): string {
  const now = Date.now();
  const expMs = now + msFromExpiresIn(expiresIn);
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = { ...payload, exp: Math.floor(expMs / 1000) };
  const h = b64u(Buffer.from(JSON.stringify(header)));
  const p = b64u(Buffer.from(JSON.stringify(data)));
  const s = signHmac(`${h}.${p}`);
  return `${h}.${p}.${s}`;
}

export function verifyToken(token: string): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, p, s] = parts;
  const expected = signHmac(`${h}.${p}`);
  if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(unb64u(p).toString('utf8')) as TokenPayload & { exp?: number };
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired');
  }
  return payload;
}
