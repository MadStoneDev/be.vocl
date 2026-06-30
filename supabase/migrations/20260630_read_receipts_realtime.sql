-- Read receipts: publish conversation_participants so a sender's client is
-- notified in realtime when the recipient's last_read_at advances (which flips
-- the sender's "seen" tick). REPLICA IDENTITY FULL ensures the UPDATE payload
-- carries profile_id + last_read_at.
ALTER TABLE conversation_participants REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
  END IF;
END $$;
