import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseServer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { communityId } = req.query;

  if (!communityId) {
    return res.status(400).json({ message: 'communityId is required.' });
  }

  try {
    const { data: leads, error } = await supabase
      .from('leads')
      .select('member_name, email, q1_response, q2_response, q3_response, created_at')
      .eq('community_id', communityId);

    if (error) {
      console.error('Error fetching leads for CSV:', error);
      return res.status(500).json({ message: 'Error fetching leads.', details: error.message });
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({ message: 'No leads found for this community.' });
    }

    // Generate CSV header
    const headers = ['Member Name', 'Email', 'Q1 Response', 'Q2 Response', 'Q3 Response', 'Captured At'];
    const csvRows = [headers.join(',')];

    // Generate CSV rows
    leads.forEach(lead => {
      const row = [
        `"${lead.member_name || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.q1_response || ''}"`,
        `"${lead.q2_response || ''}"`,
        `"${lead.q3_response || ''}"`,
        `"${new Date(lead.created_at).toLocaleString()}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${communityId}.csv"`);
    res.status(200).send(csvString);
  } catch (error) {
    console.error('Exception while generating CSV:', error);
    res.status(500).json({ message: 'Internal server error generating CSV.' });
  }
}
