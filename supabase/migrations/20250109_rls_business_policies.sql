-- 20250109_rls_business_policies.sql

-- Helper: allow bypass for service role
create or replace function public.is_service_role()
returns boolean language sql stable as $$
  select current_setting('request.jwt.claims', true)::jsonb ? 'role'
     and (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
$$;

-- Enable RLS where tables exist
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='dm_templates') then
    alter table public.dm_templates enable row level security;
    create policy if not exists dm_templates_read on public.dm_templates
      for select using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists dm_templates_write on public.dm_templates
      for insert with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists dm_templates_upd on public.dm_templates
      for update using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz')
                 with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='onboarding_questions') then
    alter table public.onboarding_questions enable row level security;
    create policy if not exists onboarding_questions_read on public.onboarding_questions
      for select using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists onboarding_questions_write on public.onboarding_questions
      for insert with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists onboarding_questions_upd on public.onboarding_questions
      for update using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz')
                 with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='leads') then
    alter table public.leads enable row level security;
    create policy if not exists leads_read on public.leads
      for select using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists leads_write on public.leads
      for insert with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    create policy if not exists leads_upd on public.leads
      for update using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz')
                 with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='dm_send_log') then
    alter table public.dm_send_log enable row level security;
    create policy if not exists dm_send_log_read on public.dm_send_log
      for select using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
    -- writes from server only (service role)
    create policy if not exists dm_send_log_write on public.dm_send_log
      for insert with check (is_service_role());
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='community_settings') then
    alter table public.community_settings enable row level security;
    create policy if not exists community_settings_rw on public.community_settings
      using (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz')
      with check (is_service_role() or business_id = current_setting('request.jwt.claims', true)::jsonb->>'biz');
  end if;
end $$;
