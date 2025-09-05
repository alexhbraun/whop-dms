-- Create user identity mapping table for quick user resolution
create table if not exists user_identity_map (
  id bigserial primary key,
  business_id text not null,
  experience_id text,
  member_id text not null,
  user_id text,
  username text,
  created_at timestamptz default now(),
  unique (business_id, member_id)
);

-- Create DM send log for idempotency and audit trail
create table if not exists dm_send_log (
  id bigserial primary key,
  event_id text not null,
  business_id text not null,
  to_user text not null, -- user_id or username
  status text not null,  -- success | deferred | failed
  message_preview text,
  error text,
  created_at timestamptz default now(),
  unique (event_id)
);

-- Add indexes for performance
create index if not exists idx_user_identity_map_business_member on user_identity_map (business_id, member_id);
create index if not exists idx_dm_send_log_event_id on dm_send_log (event_id);
create index if not exists idx_dm_send_log_status_created on dm_send_log (status, created_at);
