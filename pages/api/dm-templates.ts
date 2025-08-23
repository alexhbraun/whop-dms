import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin'; // Corrected path

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
  steps: DMTemplateStep[];
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
        if (templateId) { // Fetch single template
          const { data, error } = await supabaseAdmin
            .from('dm_templates')
            .select('*')
            .eq('community_id', communityId)
            .eq('id', templateId)
            .single();

          if (error) throw error;
          return res.status(200).json({ success: true, data: data as DMTemplate });
        } else { // Fetch all templates for a community
          const { data, error } = await supabaseAdmin
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
        const { name, steps } = req.body;
        if (!name || !steps) {
          return res.status(400).json({ success: false, error: 'Name and steps are required.' });
        }

        const { data, error } = await supabaseAdmin
          .from('dm_templates')
          .insert({
            community_id: communityId,
            name,
            steps,
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
        const { name, steps } = req.body;
        if (!name && !steps) { // Allow partial updates
          return res.status(400).json({ success: false, error: 'No update data provided.' });
        }

        const updatePayload: Partial<DMTemplate> = { updated_at: new Date().toISOString() };
        if (name) updatePayload.name = name;
        if (steps) updatePayload.steps = steps;

        const { data, error } = await supabaseAdmin
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
        const { error } = await supabaseAdmin
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
