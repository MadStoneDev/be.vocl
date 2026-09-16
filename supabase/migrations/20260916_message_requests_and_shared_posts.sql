-- Message requests + shared-post-in-message.
--
-- (a) Message requests: a 1:1 DM opened by someone the recipient does NOT follow
--     lands as a "request" until the recipient accepts. Groups are never requests
--     (the creator picks the members). Existing conversations default to
--     is_request = false, so no backfill is needed.
--
-- (c) Shared post: a message may embed a post. shared_post_id is nullable and
--     ON DELETE SET NULL so deleting the underlying post degrades the message to
--     "this post is no longer available" rather than cascading the message away.

-- (a) -------------------------------------------------------------------------
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_request   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Speeds up the recipient's "Requests" inbox lookup (partial index — only the
-- small set of rows that are actually pending requests).
CREATE INDEX IF NOT EXISTS conversations_is_request_idx
  ON conversations (requested_by)
  WHERE is_request = true;

-- (c) -------------------------------------------------------------------------
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS shared_post_id uuid REFERENCES posts(id) ON DELETE SET NULL;
