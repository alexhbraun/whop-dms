import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export type OnboardingQuestion = {
  id: string;
  business_id: string | null;
  order_index: number | null;
  question_text: string;
  type: string;
  required: boolean | null;
};

export async function listQuestionsForBusiness(businessId: string): Promise<OnboardingQuestion[]> {
  const supabase = getSupabaseClient();
  
  // 1) Try per-business
  let { data, error } = await supabase
    .from("onboarding_questions")
    .select("id,business_id,order_index,question_text,type,required")
    .eq("business_id", businessId)
    .order("order_index", { ascending: true });

  if (!error && data && data.length > 0) return data as OnboardingQuestion[];

  // 2) Fallback: global
  const fallback = await supabase
    .from("onboarding_questions")
    .select("id,business_id,order_index,question_text,type,required")
    .is("business_id", null)
    .order("order_index", { ascending: true });

  if (fallback.error || !fallback.data) return [];
  return fallback.data as OnboardingQuestion[];
}
