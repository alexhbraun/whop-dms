-- Ensure unique event_id to prevent duplicate sends
create unique index if not exists dm_send_log_event_id_uidx on public.dm_send_log(event_id);
