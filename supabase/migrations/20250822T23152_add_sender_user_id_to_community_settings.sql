-- Add sender_user_id field to community_settings table
ALTER TABLE community_settings 
ADD COLUMN IF NOT EXISTS sender_user_id text;

-- Add comment for documentation
COMMENT ON COLUMN community_settings.sender_user_id IS 'User ID of the default sender for DMs (e.g., user_123)';



