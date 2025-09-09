-- Add context column to dm_send_log table to distinguish between onboarding and debug sends
-- supabase/migrations/20250110_add_context_to_dm_send_log.sql

-- Add context column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dm_send_log' 
        AND column_name = 'context'
    ) THEN
        ALTER TABLE public.dm_send_log 
        ADD COLUMN context text DEFAULT 'debug';
    END IF;
END $$;

-- Add comment to explain the context column
COMMENT ON COLUMN public.dm_send_log.context IS 'Context of the DM send: onboarding (real member joins) or debug (manual/admin tests)';

-- Update existing rows to have context = 'debug' if they don't have it set
UPDATE public.dm_send_log 
SET context = 'debug' 
WHERE context IS NULL;
