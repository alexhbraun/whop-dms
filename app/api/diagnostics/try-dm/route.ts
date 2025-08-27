/*
 * Diagnostic API to test Whop DM functionality
 * 
 * Example usage:
 * curl -X POST https://whop-dms.vercel.app/api/diagnostics/try-dm \
 *   -H "content-type: application/json" \
 *   -d '{"bizId":"biz_XXX","recipientUserId":"user_YYY","senderUserId":"user_ZZZ","body":"Test from diagnostics"}'
 */

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { sendWhopDM } from '@/lib/whopClient';

type TryDMRequest = {
  bizId: string;
  recipientUserId: string;
  senderUserId?: string;
  body?: string;
};

type TryDMResponse = {
  ok: boolean;
  status: number;
  sent: {
    senderUserId: string;
    recipientUserId: string;
    bizId: string;
    body: string;
  };
  diagnostics: {
    usedKey: boolean;
    endpoint: string;
    bindingFound: boolean;
    environment: string;
  };
  raw: any;
};

export async function POST(req: Request): Promise<NextResponse<TryDMResponse>> {
  try {
    // Validate required environment variables
    if (!process.env.WHOP_API_KEY) {
      return NextResponse.json(
        { error: 'Missing WHOP_API_KEY' },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body: TryDMRequest = await req.json();
    
    if (!body.bizId || !body.recipientUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: bizId and recipientUserId' },
        { status: 400 }
      );
    }

    if (!body.bizId.startsWith('biz_')) {
      return NextResponse.json(
        { error: 'bizId must start with "biz_"' },
        { status: 400 }
      );
    }

    if (!body.recipientUserId.startsWith('user_')) {
      return NextResponse.json(
        { error: 'recipientUserId must start with "user_"' },
        { status: 400 }
      );
    }

    // Resolve sender user ID
    let senderUserId = body.senderUserId;
    
    if (!senderUserId) {
      // Try to get from community settings
      const supabase = getServerSupabase();
      const { data: settings } = await supabase
        .from('community_settings')
        .select('sender_user_id')
        .eq('community_id', body.bizId)
        .single();

      if (settings?.sender_user_id) {
        senderUserId = settings.sender_user_id;
      } else {
        return NextResponse.json(
          { error: 'No sender set for this business; set one in Settings or pass senderUserId' },
          { status: 400 }
        );
      }
    }

    // Validate sender user ID format
    if (!senderUserId.startsWith('user_')) {
      return NextResponse.json(
        { error: 'senderUserId must start with "user_"' },
        { status: 400 }
      );
    }

    // Check for host binding (optional)
    let bindingFound = false;
    try {
      const supabase = getServerSupabase();
      const { data: binding } = await supabase
        .from('community_host_bindings')
        .select('host, business_id')
        .eq('business_id', body.bizId)
        .single();
      
      bindingFound = !!binding;
    } catch {
      // Binding table might not exist, that's okay
      bindingFound = false;
    }

    // Prepare message body
    const messageBody = body.body || 'Test message from Whop DMS diagnostics';

    // Send the DM using existing helper
    const dmResult = await sendWhopDM({
      toMemberId: body.recipientUserId,
      text: messageBody,
      senderUserId,
      bizId: body.bizId,
    });

    // Log the attempt
    console.log(`[try-dm] biz=${body.bizId} sender=${senderUserId} recipient=${body.recipientUserId} status=${dmResult.status}`);

    // Prepare response
    const response: TryDMResponse = {
      ok: dmResult.ok,
      status: dmResult.status,
      sent: {
        senderUserId,
        recipientUserId: body.recipientUserId,
        bizId: body.bizId,
        body: messageBody,
      },
      diagnostics: {
        usedKey: !!process.env.WHOP_API_KEY,
        endpoint: `${process.env.WHOP_API_BASE || 'https://whop.com'}/api/dms`,
        bindingFound,
        environment: process.env.NODE_ENV || 'unknown',
      },
      raw: dmResult,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[try-dm] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
