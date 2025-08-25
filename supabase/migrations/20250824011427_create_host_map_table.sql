
create table if not exists host_map (
  id uuid primary key default gen_random_uuid(),
  embed_host text unique not null,
  business_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table host_map enable row security;

create policy "Allow read access for all users" on host_map
  for select using (true);

create policy "Allow insert access for authenticated users" on host_map
  for insert with check (auth.role() = 'authenticated');

create policy "Allow update access for authenticated users" on host_map
  for update using (auth.role() = 'authenticated');
