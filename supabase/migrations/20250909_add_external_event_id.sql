-- Add external_event_id column to store Whop's event ID as text
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS external_event_id text;

-- Create unique index on external_event_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_external_event_id_uniq 
ON public.webhook_events(external_event_id);
