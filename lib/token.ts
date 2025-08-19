// lib/token.ts
import crypto from 'crypto';

export interface TokenPayload {
  sub: string;
  [k: string]: unknown;
}

const SECRET = (process.env.WHOP_WEBHOOK_SECRET ?? 'dev-secret') as string;

const b64u = (buf: Buffer) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '*').replace(/=+$/g, '');
const unb64u = (str: string) =>
  Buffer.from(str.replace(/-/g, '+').replace(/\*/g, '/'), 'base64');

const signHmac = (msg: string) =>
  b64u(crypto.createHmac('sha256', SECRET).update(msg).digest());

export function signToken(payload: TokenPayload, expiresIn: string = '3600'): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (parseInt(expiresIn, 10) || 3600);
  const header = { alg: 'HS256', typ: 'JWT' };
  const data = { ...payload, exp };

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
