import { getServiceDb } from "@/lib/db/client";

export type DMTemplate = {
  id: string;
  community_id: string | null;
  name: string | null;
  content: string;
  is_default: boolean;
  created_at: string;
};

export async function getTemplateForCommunity(communityId?: string): Promise<DMTemplate | null> {
  const supabase = getServiceDb();

  if (communityId) {
    // 1) Try exact community template
    const { data: byCommunity, error: e1 } = await supabase
      .from('dm_templates')
      .select('id, community_id, name, content, is_default, created_at')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!e1 && byCommunity) return byCommunity;
  }

  // 2) Fallback default/global
  const { data: fallback, error: e2 } = await supabase
    .from('dm_templates')
    .select('id, community_id, name, content, is_default, created_at')
    .eq('is_default', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (e2) throw e2;
  return fallback ?? null;
}

// Back-compat: businessId is treated as communityId until callers migrate
export async function getTemplateForBusiness(businessId?: string): Promise<DMTemplate | null> {
  return getTemplateForCommunity(businessId);
}