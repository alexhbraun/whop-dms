create extension if not exists pgcrypto;
create table if not exists onboarding_invites (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null,
  member_id text not null,
  token text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists onboarding_invites_lookup
  on onboarding_invites (creator_id, member_id, created_at desc);

