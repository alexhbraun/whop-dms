import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type DMTemplate = {
  id: string;
  business_id: string | null;
  template_name: string | null;
  message_body: string;
};

export async function getTemplateForBusiness(businessId: string): Promise<DMTemplate | null> {
  const supabase = getSupabaseClient();
  
  // 1) Try per-business
  let { data, error } = await supabase
    .from("dm_templates")
    .select("id,business_id,template_name,message_body")
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!error && data) return data as DMTemplate;

  // 2) Fallback: global (business_id IS NULL)
  const fallback = await supabase
    .from("dm_templates")
    .select("id,business_id,template_name,message_body")
    .is("business_id", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fallback.error) return null;
  return (fallback.data as DMTemplate) ?? null;
}
