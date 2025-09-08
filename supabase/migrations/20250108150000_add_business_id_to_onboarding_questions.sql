-- 1) Add business_id to onboarding_questions (nullable so deploy is safe)
alter table public.onboarding_questions
add column if not exists business_id text;

-- 2) Optional: backfill existing global questions to NULL (explicit)
update public.onboarding_questions
set business_id = null
where business_id is distinct from null;

-- 3) Index for per-business queries
create index if not exists idx_onboarding_questions_business_id
  on public.onboarding_questions (business_id);

-- (Optional) If you want FK-like hygiene without hard FK:
-- comment: business_id should match keys in community_map.business_id
-- You can add a soft constraint via a trigger later if desired.
