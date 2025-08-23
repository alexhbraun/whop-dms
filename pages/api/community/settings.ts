import type { NextApiRequest, NextApiResponse } from 'next';
import { getCommunitySettings, updateCommunitySettings, CommunitySettings } from '../../../lib/supabaseUtils';

type Data = { success: boolean; settings?: CommunitySettings | null; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const communityId = req.query.community_id as string;

  if (!communityId) {
    return res.status(400).json({ success: false, error: 'Community ID is required.' });
  }

  if (req.method === 'GET') {
    try {
      const settings = await getCommunitySettings(communityId);
      if (settings) {
        return res.status(200).json({ success: true, settings });
      } else {
        return res.status(404).json({ success: false, error: 'Settings not found for this community.' });
      }
    } catch (error: any) {
      console.error('API Error fetching community settings:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to fetch settings.' });
    }
  } else if (req.method === 'POST') {
    try {
      const { logo_url, primary_color, secondary_color, welcome_message_title, welcome_message_body } = req.body;
      const updatedSettings = await updateCommunitySettings(communityId, {
        logo_url,
        primary_color,
        secondary_color,
        welcome_message_title,
        welcome_message_body,
      });

      if (updatedSettings) {
        return res.status(200).json({ success: true, settings: updatedSettings });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to update settings.' });
      }
    } catch (error: any) {
      console.error('API Error updating community settings:', error);
      return res.status(500).json({ success: false, error: error.message || 'Failed to update settings.' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
