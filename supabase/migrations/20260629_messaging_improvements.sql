-- Messaging improvements: per-user conversation mute + harden message UPDATE policy.

-- Per-user "mute this conversation" flag (suppresses its new-message notifications
-- and unread badge for that participant only).
ALTER TABLE conversation_participants
  ADD COLUMN IF NOT EXISTS is_muted boolean NOT NULL DEFAULT false;

-- Harden the messages UPDATE policy with a WITH CHECK so a sender can edit their
-- own message but cannot move the row into a different conversation.
DROP POLICY IF EXISTS "Senders can update own messages" ON messages;
CREATE POLICY "Senders can update own messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
