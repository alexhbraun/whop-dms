import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const communityId = url.searchParams.get('communityId') || 'biz_ZeQXyckPafiuua';
  
  try {
    const supabase = getServerSupabase();
    
    // Check what's actually in the database
    const { data: allRows, error: allError } = await supabase
      .from('onboarding_questions')
      .select('*')
      .or(`business_id.eq.${communityId},community_id.eq.${communityId}`)
      .order('created_at', { ascending: false });
    
    if (allError) {
      return NextResponse.json({ 
        ok: false, 
        error: allError.message,
        communityId 
      });
    }
    
    // Also check for any rows with this community_id specifically
    const { data: communityRows, error: communityError } = await supabase
      .from('onboarding_questions')
      .select('*')
      .eq('community_id', communityId);
    
    // And check for any rows with this business_id specifically  
    const { data: businessRows, error: businessError } = await supabase
      .from('onboarding_questions')
      .select('*')
      .eq('business_id', communityId);
    
    return NextResponse.json({
      ok: true,
      communityId,
      allRows: allRows || [],
      communityRows: communityRows || [],
      businessRows: businessRows || [],
      counts: {
        all: (allRows || []).length,
        community: (communityRows || []).length,
        business: (businessRows || []).length
      },
      errors: {
        all: allError ? String(allError) : null,
        community: communityError ? String(communityError) : null,
        business: businessError ? String(businessError) : null
      }
    });
    
  } catch (e: any) {
    return NextResponse.json({ 
      ok: false, 
      error: e.message,
      communityId 
    });
  }
}
