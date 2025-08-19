// lib/token.ts
import * as jwt from 'jsonwebtoken';
export type TokenPayload = { sub: string; [k: string]: unknown };
const SECRET = process.env.WHOP_WEBHOOK_SECRET || 'dev-secret';
export function signToken(payload: TokenPayload, expiresIn: string = '1h') {
return jwt.sign(payload, SECRET, { expiresIn });
}
export function verifyToken(token: string): TokenPayload {
const decoded = jwt.verify(token, SECRET);
if (typeof decoded === 'string') throw new Error('Invalid token');
return decoded as TokenPayload;
}
