// lib/api/authz.ts
// Authorization helpers for API endpoints

export function requireAdmin(req: Request) {
  const provided = req.headers.get('x-admin-key') ?? '';
  const expected = process.env.ADMIN_KEY;
  
  if (!expected) {
    console.error('[authz] ADMIN_KEY environment variable not set');
    throw new Response(JSON.stringify({ 
      ok: false, 
      error: 'Server configuration error' 
    }), { status: 500 });
  }
  
  const ok = provided === expected;
  if (!ok) {
    console.warn('[authz] Invalid admin key provided:', {
      provided: provided ? '***masked***' : 'missing',
      expected: '***masked***'
    });
    throw new Response(JSON.stringify({ 
      ok: false, 
      error: 'Forbidden' 
    }), { status: 403 });
  }
  
  console.log('[authz] Admin access granted');
}

export function getAdminKeyFromHeader(req: Request): string | null {
  return req.headers.get('x-admin-key');
}

export function isAdminRequest(req: Request): boolean {
  const provided = getAdminKeyFromHeader(req);
  const expected = process.env.ADMIN_KEY;
  return !!provided && !!expected && provided === expected;
}
