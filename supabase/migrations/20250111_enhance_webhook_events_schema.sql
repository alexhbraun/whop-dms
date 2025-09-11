-- supabase/migrations/20250111_enhance_webhook_events_schema.sql
-- Enhance webhook_events table with additional fields for better payload storage

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  event_type text,
  external_event_id text UNIQUE,
  community_id text,
  raw_payload jsonb,
  raw_headers jsonb,
  content_type text,
  source text DEFAULT 'webhook'
);

-- Add columns if they don't exist (safe for existing tables)
ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS raw_payload jsonb;

ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS raw_headers jsonb;

ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS content_type text;

ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS event_type text;

ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS external_event_id text;

ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS community_id text;

-- Add unique constraint on external_event_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'webhook_events_external_event_id_key'
  ) THEN
    ALTER TABLE public.webhook_events 
    ADD CONSTRAINT webhook_events_external_event_id_key UNIQUE (external_event_id);
  END IF;
END $$;

-- Add index on created_at for efficient ordering
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at 
ON public.webhook_events (created_at DESC);

-- Add index on external_event_id for lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_external_event_id 
ON public.webhook_events (external_event_id);

-- Add index on community_id for filtering
CREATE INDEX IF NOT EXISTS idx_webhook_events_community_id 
ON public.webhook_events (community_id);
