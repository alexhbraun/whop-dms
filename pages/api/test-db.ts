import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabase } from '../../lib/supabaseServer';

type Data = { success: boolean; message?: string; testData?: any; error?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const communityId = req.query.community_id as string || 'default_community_1'; // Use a default for testing

  try {
    const supabase = getServerSupabase();
    // Test insert (optional, for write testing)
    const { data: insertData, error: insertError } = await supabase
      .from('test_table') // Replace 'test_table' with an actual table in your DB or create one.
      .insert([{
        community_id: communityId,
        test_key: 'value_from_api',
        created_at: new Date().toISOString()
      }])
      .select();

    if (insertError) {
      console.error('Supabase insert test error:', insertError);
      // return res.status(500).json({ success: false, error: insertError.message });
    }

    // Test select
    const { data: selectData, error: selectError } = await supabase
      .from('test_table') // Replace 'test_table'
      .select('*')
      .eq('community_id', communityId)
      .limit(5);

    if (selectError) {
      console.error('Supabase select test error:', selectError);
      throw new Error(selectError.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Supabase connection and operations successful!',
      testData: selectData,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ success: false, error: error.message || 'An unexpected error occurred.' });
  }
}
