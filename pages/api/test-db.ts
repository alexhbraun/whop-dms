import type { NextApiRequest, NextApiResponse } from 'next'
import supabaseAdmin from '../../lib/supabaseAdmin'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Insert a new row
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('test_table')
      .insert([{ message: 'Hello from API' }])
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: insertError.message });
    }

    // Select the last 5 rows
    const { data: selectData, error: selectError } = await supabaseAdmin
      .from('test_table')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (selectError) {
      console.error('Select error:', selectError);
      return res.status(500).json({ error: selectError.message });
    }

    res.status(200).json({ inserted: insertData[0], latestFive: selectData });
  } catch (err: any) {
    console.error('Catch error:', err);
    res.status(500).json({ error: err.message });
  }
}
