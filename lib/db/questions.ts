import { getServiceDb } from "@/lib/db/client";

export type OnboardingQuestion = {
  id: string;
  community_id: string | null;
  business_id: string | null; // Keep for backward compatibility
  order_index: number | null;
  question_text: string;
  type: string;
  required: boolean | null;
};

export async function listQuestionsForCommunity(communityId?: string): Promise<OnboardingQuestion[]> {
  const supabase = getServiceDb();
  
  if (communityId) {
    // 1) Try per-community
    let { data, error } = await supabase
      .from("onboarding_questions")
      .select("id,community_id,business_id,order_index,question_text,type,required")
      .eq("community_id", communityId)
      .order("order_index", { ascending: true });

    if (!error && data && data.length > 0) return data as OnboardingQuestion[];
  }

  // 2) Fallback: global (community_id IS NULL)
  const fallback = await supabase
    .from("onboarding_questions")
    .select("id,community_id,business_id,order_index,question_text,type,required")
    .is("community_id", null)
    .order("order_index", { ascending: true });

  if (fallback.error || !fallback.data) return [];
  return fallback.data as OnboardingQuestion[];
}

// Back-compat: businessId is treated as communityId until callers migrate
export async function listQuestionsForBusiness(businessId: string): Promise<OnboardingQuestion[]> {
  return listQuestionsForCommunity(businessId);
}
