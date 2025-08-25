import { getServerSupabase } from './supabaseServer';

export interface CommunitySettings {
  community_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  welcome_message_title: string | null;
  welcome_message_body: string | null;
}

export async function getCommunitySettings(communityId: string): Promise<CommunitySettings | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('community_settings')
    .select('*')
    .eq('community_id', communityId)
    .single();

  if (error) {
    console.error('Error fetching community settings:', error);
    return null;
  }

  return data as CommunitySettings;
}

export async function updateCommunitySettings(
  communityId: string,
  settings: Partial<Omit<CommunitySettings, 'community_id' | 'created_at' | 'updated_at'>>
): Promise<CommunitySettings | null> {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('community_settings')
    .update({ ...settings, updated_at: new Date().toISOString() })
    .eq('community_id', communityId)
    .select()
    .single();

  if (error) {
    console.error('Error updating community settings:', error);
    return null;
  }

  return data as CommunitySettings;
}
