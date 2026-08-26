-- Group conversations (Phase 1). A group is a normal conversation with
-- is_group = true, plus a name and an owner. Reuses the existing membership
-- model, RLS (is_conversation_member), realtime, and the get_conversation_previews
-- RPC — all already N-participant-safe. See GROUP-CHAT-PLAN-2026-08-26.md.
--
-- Participant role / joined_at / left_at (for membership management) are Phase 2.

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
