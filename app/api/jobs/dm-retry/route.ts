import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getWhopSdk } from "@/lib/whop-sdk";
import { getBaseUrl } from "@/lib/urls";
import { DM_ENABLED } from "@/lib/feature-flags";

function getSupabaseClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  if (!DM_ENABLED) {
    return NextResponse.json({ 
      retried: 0, 
      note: "DM onboarding disabled" 
    });
  }

  try {
    const supabase = getSupabaseClient();
    // Get deferred DMs from the last 2 days
    const { data: rows } = await supabase
      .from("dm_send_log")
      .select("event_id, business_id, to_user, message_preview, created_at")
      .eq("status", "deferred")
      .gte("created_at", new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString())
      .limit(50);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ retried: 0, note: "no deferred DMs to retry" });
    }

    console.log(`[DM-RETRY] Processing ${rows.length} deferred DMs`);

    let retried = 0;
    let resolved = 0;

    for (const row of rows) {
      try {
        // Try to resolve the user again
        const toUser = await resolveUserForRetry(row.business_id, row.to_user);
        
        if (!toUser) {
          console.log(`[DM-RETRY] Still cannot resolve user for event ${row.event_id}`);
          continue;
        }

        resolved++;

        // Try to send the DM
        const message = row.message_preview || buildWelcomeDm({ 
          business_id: row.business_id, 
          member_id: row.to_user 
        });

        const whop = getWhopSdk();
        await whop.messages.sendDirectMessageToUser({
          toUserIdOrUsername: toUser,
          message,
        });

        // Update status to success
        await supabase
          .from("dm_send_log")
          .update({ 
            status: "success",
            to_user: toUser,
            error: null
          })
          .eq("event_id", row.event_id);

        retried++;
        console.log(`[DM-RETRY] Successfully sent DM for event ${row.event_id}`);

      } catch (error: any) {
        console.error(`[DM-RETRY] Failed to retry DM for event ${row.event_id}:`, error);
        
        // Update status to failed
        await supabase
          .from("dm_send_log")
          .update({ 
            status: "failed",
            error: error?.message || "retry failed"
          })
          .eq("event_id", row.event_id);
      }
    }

    return NextResponse.json({ 
      retried, 
      resolved,
      total: rows.length,
      note: `Processed ${rows.length} deferred DMs, resolved ${resolved}, sent ${retried}`
    });

  } catch (error) {
    console.error("[DM-RETRY] Unexpected error:", error);
    return NextResponse.json({ 
      retried: 0, 
      error: "internal error" 
    }, { status: 500 });
  }
}

async function resolveUserForRetry(business_id: string, to_user: string) {
  const supabase = getSupabaseClient();
  // First, try to find in our cache
  const { data: cached } = await supabase
    .from("user_identity_map")
    .select("user_id, username")
    .eq("business_id", business_id)
    .eq("member_id", to_user)
    .maybeSingle();

  if (cached?.user_id || cached?.username) {
    return cached.user_id || cached.username;
  }

  // If to_user looks like a user_id or username, try it directly
  if (to_user.startsWith("user_") || to_user.includes("@")) {
    return to_user;
  }

  // Try to find any experience for this business and search for the user
  try {
    const { data: experiences } = await supabase
      .from("community_settings")
      .select("experience_id")
      .eq("community_id", business_id)
      .not("experience_id", "is", null)
      .limit(1);

    if (experiences && experiences.length > 0) {
      const experience_id = experiences[0].experience_id;
      const whop = getWhopSdk();
      const result = await whop.experiences.listUsersForExperience({
        experienceId: experience_id,
        searchQuery: to_user,
        first: 3,
      });
      
      const node = result?.users?.nodes?.[0];
      if (node?.id || node?.username) {
        const resolvedUser = node.id || node.username;
        
        // Cache the resolution
        await supabase
          .from("user_identity_map")
          .upsert({
            business_id,
            member_id: to_user,
            user_id: node.id || null,
            username: node.username || null,
          }, { onConflict: "business_id,member_id" });
        
        return resolvedUser;
      }
    }
  } catch (error) {
    console.warn(`[DM-RETRY] Failed to resolve user via experience:`, error);
  }

  return null;
}

function buildWelcomeDm({ business_id, member_id }: { business_id: string; member_id: string }) {
  const baseUrl = getBaseUrl();
  const onboardingUrl = `${baseUrl}/onboarding/${business_id}?member=${member_id}`;
  
  return `🎉 Welcome to the community! Complete your onboarding here: ${onboardingUrl}`;
}
