import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { requireAdminSecret } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

const REQUIRED_ENVS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'WHOP_API_KEY',
  'WHOP_AGENT_USER_ID',
  'WHOP_COMPANY_ID',
];

function ok(v: any) { return { ok: true, ...v }; }
function fail(msg: string, extra: any = {}) { return { ok: false, error: msg, ...extra }; }

export async function GET(req: Request) {
  requireAdminSecret(req);
  const url = new URL(req.url);
  const communityId = url.searchParams.get('community_id') || '';
  const host = url.searchParams.get('host') || ''; // optional override for testing
  const checkWebhookReachability = url.searchParams.get('probe_webhook') === '1';

  const report: any = { timestamp: new Date().toISOString(), input: { communityId, host } };

  // 1) envs
  const missing = REQUIRED_ENVS.filter((k) => !process.env[k]);
  report.envs = missing.length === 0
    ? ok({ message: 'All required env vars present' })
    : fail('Missing required env vars', { missing });

  // 2) supabase connectivity
  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase.from('dm_templates').select('id').limit(1);
    if (error) throw error;
    report.supabase = ok({ message: 'Connected to Supabase' });
  } catch (e: any) {
    report.supabase = fail('Cannot connect to Supabase or table not accessible', { detail: e?.message });
  }

  // Helper to check if table exists
  const checkTableExists = async (supabase: any, table: string) => {
    const r = await supabase.from(table as any).select('*').limit(0);
    return !r.error;
  };

  // 3) schema checks (tables + columns)
  try {
    const supabase = getServerSupabase();

    const need = {
      dm_templates: ['id', 'community_id', 'name', 'content', 'is_default', 'created_at', 'updated_at'],
      community_settings: ['community_id', 'require_email', 'webhook_url'],
      leads: ['id'], // relax to presence
      host_map: ['host', 'business_id'], // check for host mapping table
    };

    const schemaRes: Record<string, any> = {};
    for (const [table, cols] of Object.entries(need)) {
      const hasTable = await checkTableExists(supabase, table);
      if (!hasTable) {
        schemaRes[table] = fail('Missing table');
        continue;
      }
      
      // For basic table existence, mark as OK
      // In a real implementation, you'd check specific columns via information_schema
      schemaRes[table] = ok({ message: 'Table exists' });
    }
    report.schema = schemaRes;
  } catch (e: any) {
    report.schema = fail('Schema check failed', { detail: e?.message });
  }

  // 4) business binding for host
  try {
    const supabase = getServerSupabase();
    const embedHost = host || (url.searchParams.get('embed_host') || '');
    if (!embedHost) {
      report.binding = fail('No embed host provided (pass ?host=<hr...apps.whop.com>)');
    } else {
      const { data, error } = await supabase
        .from('host_map')
        .select('host,business_id,created_at')
        .eq('host', embedHost)
        .limit(1);
      if (error) {
        report.binding = fail('Binding lookup failed (host_map table may not exist)', { detail: error.message });
      } else if (!data || data.length === 0) {
        report.binding = fail('No binding for this host', { host: embedHost });
      } else {
        const binding = data[0];
        report.binding = ok({ host: embedHost, business_id: binding.business_id });
      }
    }
  } catch (e: any) {
    report.binding = fail('Binding lookup failed', { detail: e?.message });
  }

  // 5) settings row
  try {
    if (!communityId) {
      report.settings = fail('No community_id provided to check settings (pass ?community_id=biz_...)');
    } else {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('community_settings')
        .select('require_email,webhook_url,updated_at')
        .eq('community_id', communityId)
        .limit(1);
      if (error) throw error;
      if (!data || data.length === 0) {
        report.settings = fail('No settings row (UI will upsert defaults on save)');
      } else {
        const settingsRow = data[0];
        const urlVal = settingsRow.webhook_url || null;
        report.settings = ok({
          require_email: !!settingsRow.require_email,
          webhook_configured: !!urlVal,
          webhook_url_preview: urlVal ? (urlVal as string).replace(/^(https?:\/\/)(.+)(.{4})$/, '$1••••$3') : null,
        });

        // Optional reachability probe
        if (urlVal && checkWebhookReachability) {
          try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000);
            const resp = await fetch(urlVal, { method: 'HEAD', signal: controller.signal });
            clearTimeout(id);
            report.settings.webhook_probe = { ok: resp.ok, status: resp.status };
          } catch (e: any) {
            report.settings.webhook_probe = { ok: false, error: e?.message || 'probe failed' };
          }
        }
      }
    }
  } catch (e: any) {
    report.settings = fail('Settings check failed', { detail: e?.message });
  }

  // 6) default DM template exists
  try {
    if (!communityId) {
      report.templates = fail('No community_id provided to check templates');
    } else {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('dm_templates')
        .select('id,name,is_default')
        .eq('community_id', communityId)
        .order('is_default', { ascending: false })
        .limit(5);
      if (error) throw error;
      const hasDefault = (data || []).some((t: any) => t.is_default);
      report.templates = hasDefault
        ? ok({ count: data?.length || 0, default: (data || []).find((t:any)=>t.is_default)?.name })
        : fail('No default template set', { count: data?.length || 0 });
    }
  } catch (e: any) {
    report.templates = fail('Template check failed', { detail: e?.message });
  }

  // 7) onboarding questions presence (optional if not yet built)
  try {
    if (!communityId) {
      report.questions = fail('No community_id provided to check questions');
    } else {
      const supabase = getServerSupabase();
      const { data, error } = await supabase
        .from('onboarding_questions')
        .select('id')
        .eq('community_id', communityId)
        .limit(1);
      if (error) {
        // If table doesn't exist yet, mark as info—not failure
        report.questions = { ok: false, error: 'onboarding_questions table not found or inaccessible (informational)' };
      } else {
        report.questions = ok({ hasAny: (data || []).length > 0 });
      }
    }
  } catch {
    report.questions = { ok: false, error: 'questions check skipped' };
  }

  return NextResponse.json(report);
}
