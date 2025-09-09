-- Fix dm_send_log table columns
ALTER TABLE public.dm_send_log 
ADD COLUMN IF NOT EXISTS source text,
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Fix webhook_events table columns  
ALTER TABLE public.webhook_events 
ADD COLUMN IF NOT EXISTS raw jsonb,
ADD COLUMN IF NOT EXISTS business_id text,
ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now();

-- Create webhook_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text,
  received_at timestamptz DEFAULT now(),
  raw jsonb,
  business_id text
);
