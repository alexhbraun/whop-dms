import { NextApiRequest, NextApiResponse } from 'next';

const WHOP_API_KEY = process.env.WHOP_API_KEY;
const MOCK_DM = process.env.MOCK_DM;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { member_id, community_id, message, template_version } = req.body;

  if (!member_id || !message) {
    return res.status(400).json({ message: 'Missing member_id or message' });
  }

  if (!WHOP_API_KEY && (process.env.NODE_ENV === 'production' || MOCK_DM !== '1')) {
    console.error('WHOP_API_KEY is not set and not in mock mode.');
    return res.status(500).json({ message: 'Server configuration error: Whop API key missing.' });
  }

  if (process.env.NODE_ENV !== 'production' && MOCK_DM === '1') {
    console.log('MOCK DM SENT:', { member_id, community_id, message, template_version });
    return res.status(200).json({ message: 'Mock welcome DM sent successfully.' });
  }

  try {
    const whopResponse = await fetch(`https://api.whop.com/api/v2/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHOP_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: member_id,
        body: message,
        community: community_id, // Whop API expects 'community_id' as 'community'
      }),
    });

    if (!whopResponse.ok) {
      const errorData = await whopResponse.json();
      console.error('Error sending DM via Whop API:', errorData);
      return res.status(502).json({ message: 'Failed to send DM via Whop API', details: errorData }); // Return 502 for non-200 Whop responses
    }

    res.status(200).json({ message: 'Welcome DM sent successfully via Whop API.' });
  } catch (error) {
    console.error('Exception while calling Whop API:', error);
    res.status(500).json({ message: 'Internal server error while sending DM.' });
  }
}
