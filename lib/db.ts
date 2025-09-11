// lib/db.ts
// Database utility functions

export function coerceEventId(eid: string) {
  // Your dm_send_log.event_id is text; accept either a UUID or evt_smoke_* string; return as text.
  return String(eid);
}
