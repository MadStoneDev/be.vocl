-- When a post enters the queue we stamp queued_at, so the queue publisher can
-- pace off "when it was queued" rather than created_at. This matters for the
-- drafts path: an old draft moved into the queue has an old created_at, which
-- would otherwise let it reach back into the day's already-passed slots and
-- publish immediately. queued_at is set at queue-entry and never changes on edit.
alter table posts add column if not exists queued_at timestamptz;

-- Backfill existing queued posts so the guard has a sane value immediately.
update posts
set queued_at = created_at
where status = 'queued' and queued_at is null;
