import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import getRawBody from 'raw-body';

// If you know the exact header name Whop uses, set it here (lowercased).
// We default to a likely value but also check a few alternates.
const SIGNATURE_HEADER_CANDIDATES = [
  process.env.WHOP_SIGNATURE_HEADER?.toLowerCase() || 'x-whop-signature',
  'x-hook-signature',
  'whop-signature',
];

export const config = {
  api: {
    bodyParser: false, // IMPORTANT: we need raw bytes for HMAC
  },
};

function timingSafeEqual(a: string, b: string) {
  const abuf = Buffer.from(a || '', 'utf8');
  const bbuf = Buffer.from(b || '', 'utf8');
  if (abuf.length !== bbuf.length) return false;
  return crypto.timingSafeEqual(abuf, bbuf);
}

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return getRawBody(req, { encoding: null });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ ok: false, error: 'missing WHOP_WEBHOOK_SECRET' });
  }

  // 1) Read raw body
  let raw: Buffer;
  try {
    raw = await readRawBody(req);
  } catch (e) {
    return res.status(400).json({ ok: false, error: 'invalid body' });
  }

  // 2) Get signature header (try multiple header names)
  const headers = req.headers;
  const sigHeader =
    SIGNATURE_HEADER_CANDIDATES
      .map((h) => (Array.isArray(headers[h]) ? headers[h]?.[0] : headers[h]))
      .find((v) => typeof v === 'string') as string | undefined;

  if (!sigHeader) {
    return res.status(401).json({ ok: false, error: 'missing signature header' });
  }

  // 3) Compute HMAC of raw body using shared secret
  const computed = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  // If Whop provides base64 instead of hex, also compare that variant:
  const computedB64 = Buffer.from(
    crypto.createHmac('sha256', secret).update(raw).digest()
  ).toString('base64');

  const presented = sigHeader.trim();
  const verified =
    timingSafeEqual(presented, computed) ||
    timingSafeEqual(presented, computedB64) ||
    timingSafeEqual(presented.replace(/^sha256=/i, ''), computed) || // some vendors prefix "sha256="
    timingSafeEqual(presented.replace(/^sha256=/i, ''), computedB64);

  if (!verified) {
    return res.status(401).json({ ok: false, error: 'invalid signature' });
  }

  // 4) Parse JSON after verification
  let event: any;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ ok: false, error: 'invalid json' });
  }

  // 5) Idempotency (optional but recommended)
  const deliveryId =
    (Array.isArray(headers['x-whop-delivery-id']) ? headers['x-whop-delivery-id'][0] : headers['x-whop-delivery-id']) ||
    (Array.isArray(headers['x-delivery-id']) ? headers['x-delivery-id'][0] : headers['x-delivery-id']) ||
    event?.id;

  // TODO: check if deliveryId already processed in your DB/kv and early-return 200 if so

  // 6) Handle event types (fill in as needed)
  // Example expected shape: { type: string, data: {...} }
  try {
    switch (event?.type) {
      case 'member.created':
      case 'member.updated':
      case 'subscription.created':
      case 'subscription.updated':
      case 'purchase.completed':
        // TODO: upsert to your DB; enqueue jobs, etc.
        break;
      default:
        // Unknown event – accept anyway so Whop doesn't retry forever
        break;
    }
  } catch (err) {
    // If your processing fails, still return 200 after enqueueing a retryable job if possible.
    // For now we surface 500 to know it failed during testing.
    return res.status(500).json({ ok: false, error: 'handler error', detail: String(err) });
  }

  // 7) Ack quickly
  return res.status(200).json({ ok: true });
}
