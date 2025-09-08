import { createClient } from "@supabase/supabase-js";

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function hasSentForEvent(eventId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("dm_send_log")
    .select("event_id,status")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function recentDmSends(limit = 50) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("dm_send_log")
    .select("event_id,to_user,status,error,created_at,message_preview")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
