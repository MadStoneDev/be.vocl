-- Messaging features: reactions, replies, and voice notes
-- Idempotent migration (safe to re-run).

-- ============================================================================
-- 1. MESSAGE REACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: members of the message's conversation can view reactions.
-- Uses the existing is_conversation_member SECURITY DEFINER helper to avoid
-- recursion, matching the messages SELECT policy convention.
DROP POLICY IF EXISTS "Conversation members can view reactions" ON message_reactions;
CREATE POLICY "Conversation members can view reactions"
  ON message_reactions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_member(m.conversation_id)
    )
  );

-- INSERT: only your own reactions, and only on messages in a conversation you belong to.
DROP POLICY IF EXISTS "Members can add own reactions" ON message_reactions;
CREATE POLICY "Members can add own reactions"
  ON message_reactions FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_member(m.conversation_id)
    )
  );

-- DELETE: only your own reactions, and only on messages in a conversation you belong to.
DROP POLICY IF EXISTS "Members can remove own reactions" ON message_reactions;
CREATE POLICY "Members can remove own reactions"
  ON message_reactions FOR DELETE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_reactions.message_id
      AND is_conversation_member(m.conversation_id)
    )
  );

-- Realtime: add to the publication, guarded so re-running does not error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
  END IF;
END $$;

-- ============================================================================
-- 2. REPLIES (threaded messages)
-- ============================================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

-- ============================================================================
-- 3. VOICE NOTES
-- ============================================================================

-- messages.media_type is free-text TEXT with no CHECK constraint or enum
-- (see 00001_initial_schema.sql), so the value 'audio' can be used directly
-- with no schema change. Add a duration column to store voice-note length
-- (in seconds).
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_duration INT;
