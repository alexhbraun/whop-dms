-- 1) Add columns
alter table public.dm_send_log
add column if not exists business_id text,
add column if not exists template_id uuid;

-- 2) Optional backfill to NULL
update public.dm_send_log
set business_id = business_id, template_id = template_id;

-- 3) Helpful indexes
create index if not exists idx_dm_send_log_business_id
  on public.dm_send_log (business_id);

create index if not exists idx_dm_send_log_template_id
  on public.dm_send_log (template_id);
