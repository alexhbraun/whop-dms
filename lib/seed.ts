// lib/seed.ts
import { createClient } from "@supabase/supabase-js";

function serverClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function ensureDefaultSeedForBusiness(businessId: string) {
  const supabase = serverClient();

  // 1) template
  const { data: tplCount } = await supabase
    .from("dm_templates")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (!tplCount || (tplCount as any).count === 0) {
    const welcome =
      "👋 Welcome to the community! I'm your host.\n" +
      "Tell me a bit about you (it helps me tailor your experience):";
    await supabase.from("dm_templates").insert({
      business_id: businessId,
      template_name: "Nexo — Friendly Welcome",
      message_body: welcome,
      is_default: true,
    }).select().single();
  }

  // 2) questions
  const { data: qCount } = await supabase
    .from("onboarding_questions")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (!qCount || (qCount as any).count === 0) {
    const base = [
      { order_index: 1, question_text: "What is your email?", type: "email", required: true },
      { order_index: 2, question_text: "What is your age?", type: "short_text", required: false },
      { order_index: 3, question_text: "Where do you come from?", type: "short_text", required: false },
      { order_index: 4, question_text: "What is your city?", type: "short_text", required: false },
    ];
    await supabase.from("onboarding_questions").insert(
      base.map(q => ({ ...q, business_id: businessId }))
    );
  }
}
