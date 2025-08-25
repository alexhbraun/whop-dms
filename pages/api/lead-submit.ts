// pages/api/lead-submit.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabase } from '../../lib/supabaseServer'; // Using getServerSupabase

type Data = { success: boolean; message?: string; error?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { community_id, name, email } = req.body;

  if (!community_id || !name || !email) {
    return res.status(400).json({ success: false, error: 'Community ID, Name, and Email are required.' });
  }

  try {
    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        community_id,
        name,
        email,
        // Add other lead fields as necessary
      }])
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      throw new Error(error.message);
    }

    return res.status(200).json({ success: true, message: 'Lead submitted successfully!', data });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred.' });
  }
}
