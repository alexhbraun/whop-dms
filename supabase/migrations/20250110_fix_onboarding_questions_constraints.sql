-- Fix onboarding_questions table constraints and data consistency
-- This migration addresses the unique constraint conflict between community_id and business_id

-- 1) First, let's see what constraints exist and drop the problematic one
DO $$ 
BEGIN
    -- Drop the unique constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_key_slug_per_community' 
        AND table_name = 'onboarding_questions'
    ) THEN
        ALTER TABLE public.onboarding_questions 
        DROP CONSTRAINT unique_key_slug_per_community;
    END IF;
END $$;

-- 2) Create a new unique constraint on (key_slug, business_id) instead
-- This ensures key_slug is unique per business, not per community
ALTER TABLE public.onboarding_questions 
ADD CONSTRAINT unique_key_slug_per_business 
UNIQUE (key_slug, business_id);

-- 3) Migrate any existing data from community_id to business_id
-- This handles the case where old data uses community_id
UPDATE public.onboarding_questions 
SET business_id = community_id 
WHERE business_id IS NULL AND community_id IS NOT NULL;

-- 4) Clean up any duplicate key_slugs by adding a suffix
-- This prevents conflicts when migrating data
WITH duplicates AS (
    SELECT id, key_slug, business_id, 
           ROW_NUMBER() OVER (PARTITION BY key_slug, business_id ORDER BY created_at) as rn
    FROM public.onboarding_questions 
    WHERE business_id IS NOT NULL
)
UPDATE public.onboarding_questions 
SET key_slug = key_slug || '_' || (duplicates.rn - 1)::text
FROM duplicates 
WHERE public.onboarding_questions.id = duplicates.id 
AND duplicates.rn > 1;

-- 5) Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_key_slug_business 
ON public.onboarding_questions (key_slug, business_id);
