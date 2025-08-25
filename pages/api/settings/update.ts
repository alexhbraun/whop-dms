import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabase } from '../../../lib/supabaseServer';

type Data = { success: boolean; message?: string; error?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { community_id, webhook_url, email_required, branding_logo_url, branding_primary_color, branding_secondary_color } = req.body;

  if (!community_id) {
    return res.status(400).json({ success: false, error: 'Community ID is required.' });
  }

  try {
    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (webhook_url !== undefined) updatePayload.webhook_url = webhook_url;
    if (email_required !== undefined) updatePayload.email_required = email_required;
    if (branding_logo_url !== undefined) updatePayload.branding_logo_url = branding_logo_url;
    if (branding_primary_color !== undefined) updatePayload.branding_primary_color = branding_primary_color;
    if (branding_secondary_color !== undefined) updatePayload.branding_secondary_color = branding_secondary_color;

    const supabase = getServerSupabase();
    const { data, error } = await supabase.from('installations').update(updatePayload)
      .eq('community_id', community_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({ success: true, message: 'Settings updated successfully!', data });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred.' });
  }
}

