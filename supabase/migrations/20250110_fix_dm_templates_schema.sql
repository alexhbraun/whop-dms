-- Fix dm_templates table to have the correct schema
-- Add missing columns if they don't exist
ALTER TABLE public.dm_templates 
ADD COLUMN IF NOT EXISTS content text,
ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;

-- If the table has business_id and template_name columns, we'll keep them for now
-- but add community_id and name if they don't exist
ALTER TABLE public.dm_templates 
ADD COLUMN IF NOT EXISTS community_id text,
ADD COLUMN IF NOT EXISTS name text;

-- Create the debug view
DROP VIEW IF EXISTS public.dm_templates_debug;

CREATE OR REPLACE VIEW public.dm_templates_debug AS
SELECT
  id,
  community_id,
  name as template_name,
  LEFT(content, 140) as preview,
  created_at
FROM public.dm_templates
ORDER BY created_at DESC;
