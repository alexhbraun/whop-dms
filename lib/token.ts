// lib/token.ts
import * as jwt from 'jsonwebtoken';

export type TokenPayload = {
  memberId?: string;
  communityId?: string;
  community_id?: string;
  member_id?: string;
  exp?: number;
};

export function signToken(payload: TokenPayload, secret: string): string {
  // Ensure that community_id and member_id are always present in snake_case for consistency
  const tokenPayload = {
    community_id: payload.community_id || payload.communityId,
    member_id: payload.member_id || payload.memberId,
    exp: payload.exp,
  };
  return jwt.sign(tokenPayload, secret);
}

export function verifyToken(token: string, secret: string): { ok: true; data: TokenPayload } | { ok: false; reason: string } {
  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    return { ok: true, data: decoded };
  } catch (e: any) {
    return { ok: false, reason: e?.message || 'token verification failed' };
  }
}
