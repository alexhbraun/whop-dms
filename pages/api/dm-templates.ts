import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSupabase } from '../../lib/supabaseServer'; // Corrected path

export type DMTemplateStep = {
  step_order: number;
  question_text: string;
  require_email?: boolean;
  response_type?: 'short_text' | 'long_text' | 'email' | 'options';
  options?: string[];
};

export type DMTemplate = {
  id: number;
  community_id: string;
  name: string;
  subject: string;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

type Data = { success: boolean; data?: DMTemplate | DMTemplate[] | null; error?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // For simplicity, assuming communityId is passed as a query parameter for all operations
  // In a real app, this would likely come from an authenticated user's session.
  const communityId = req.query.community_id as string;
  const templateId = req.query.id as string; // For PUT and DELETE

  if (!communityId) {
    return res.status(400).json({ success: false, error: 'Community ID is required.' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const supabase = getServerSupabase();
        if (templateId) { // Fetch single template
          const { data, error } = await supabase
            .from('dm_templates')
            .select('*')
            .eq('community_id', communityId)
            .eq('id', templateId)
            .single();

          if (error) throw error;
          return res.status(200).json({ success: true, data: data as DMTemplate });
        } else { // Fetch all templates for a community
          const supabase = getServerSupabase();
          const { data, error } = await supabase
            .from('dm_templates')
            .select('*')
            .eq('community_id', communityId)
            .order('created_at', { ascending: true });

          if (error) throw error;
          return res.status(200).json({ success: true, data: data as DMTemplate[] });
        }
      } catch (error: any) {
        console.error('API Error fetching DM templates:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to fetch DM templates.' });
      }

    case 'POST':
      try {
        const { name, subject, body, is_default } = req.body;
        if (!name || !body) {
          return res.status(400).json({ success: false, error: 'Name and body are required.' });
        }

        const supabase = getServerSupabase();
        const { data, error } = await supabase
          .from('dm_templates')
          .insert({
            community_id: communityId,
            name,
            subject,
            body,
            is_default: is_default || false,
          })
          .select('*')
          .single();

        if (error) throw error;
        return res.status(201).json({ success: true, data: data as DMTemplate });
      } catch (error: any) {
        console.error('API Error creating DM template:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to create DM template.' });
      }

    case 'PUT':
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'Template ID is required for updating.' });
      }
      try {
        const { name, subject, body, is_default } = req.body;

        const updatePayload: Partial<Omit<DMTemplate, 'id' | 'community_id' | 'created_at'>> = { updated_at: new Date().toISOString() };
        if (name !== undefined) updatePayload.name = name;
        if (subject !== undefined) updatePayload.subject = subject;
        if (body !== undefined) updatePayload.body = body;
        if (is_default !== undefined) updatePayload.is_default = is_default;

        const supabase = getServerSupabase();
        const { data, error } = await supabase
          .from('dm_templates')
          .update(updatePayload)
          .eq('community_id', communityId)
          .eq('id', templateId)
          .select('*')
          .single();

        if (error) throw error;
        return res.status(200).json({ success: true, data: data as DMTemplate });
      } catch (error: any) {
        console.error('API Error updating DM template:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to update DM template.' });
      }

    case 'DELETE':
      if (!templateId) {
        return res.status(400).json({ success: false, error: 'Template ID is required for deleting.' });
      }
      try {
        const supabase = getServerSupabase();
        const { error } = await supabase
          .from('dm_templates')
          .delete()
          .eq('community_id', communityId)
          .eq('id', templateId);

        if (error) throw error;
        return res.status(204).json({ success: true }); // No content for successful delete
      } catch (error: any) {
        console.error('API Error deleting DM template:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to delete DM template.' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
