-- Voice features on posts/asks: audio asks, audio answers, and spoken
-- reactions on posts. Idempotent migration (safe to re-run).
--
-- Context:
--   * Asks are stored in the `asks` table (question lives in `asks.question`).
--   * An answered ask creates a `posts` row (post_type='ask') whose JSONB
--     `content` holds the answer (answer_html, etc.). The post `content` JSON
--     can also carry the answer audio, but for parity and easy querying we add
--     explicit audio columns to the `asks` table for both the question and the
--     answer.

-- ============================================================================
-- 1. AUDIO ASKS / ANSWERS  (columns on the asks table)
-- ============================================================================
-- question_audio_*  -> voice recording of the asker's question
-- answer_audio_*    -> voice recording of the recipient's answer
ALTER TABLE asks ADD COLUMN IF NOT EXISTS question_audio_url TEXT;
ALTER TABLE asks ADD COLUMN IF NOT EXISTS question_audio_duration INT;
ALTER TABLE asks ADD COLUMN IF NOT EXISTS answer_audio_url TEXT;
ALTER TABLE asks ADD COLUMN IF NOT EXISTS answer_audio_duration INT;

-- ============================================================================
-- 2. POST AUDIO REACTIONS  (spoken reactions on posts)
-- ============================================================================
-- One spoken reaction per user per post; they can replace (UPDATE) it.
CREATE TABLE IF NOT EXISTS post_audio_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  duration INT,
  transcript TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_audio_reactions_post ON post_audio_reactions(post_id);

ALTER TABLE post_audio_reactions ENABLE ROW LEVEL SECURITY;

-- SELECT: public read, matching the `likes` / `comments` SELECT policies which
-- are USING (true) (posts and their engagement are publicly readable).
DROP POLICY IF EXISTS "Audio reactions are viewable by everyone" ON post_audio_reactions;
CREATE POLICY "Audio reactions are viewable by everyone"
  ON post_audio_reactions FOR SELECT USING (true);

-- INSERT: only your own reaction.
DROP POLICY IF EXISTS "Users can add own audio reaction" ON post_audio_reactions;
CREATE POLICY "Users can add own audio reaction"
  ON post_audio_reactions FOR INSERT WITH CHECK (user_id = auth.uid());

-- UPDATE: only your own reaction (replace audio).
DROP POLICY IF EXISTS "Users can update own audio reaction" ON post_audio_reactions;
CREATE POLICY "Users can update own audio reaction"
  ON post_audio_reactions FOR UPDATE USING (user_id = auth.uid());

-- DELETE: only your own reaction.
DROP POLICY IF EXISTS "Users can delete own audio reaction" ON post_audio_reactions;
CREATE POLICY "Users can delete own audio reaction"
  ON post_audio_reactions FOR DELETE USING (user_id = auth.uid());

-- Realtime: add to the publication, guarded so re-running does not error.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'post_audio_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE post_audio_reactions;
  END IF;
END $$;
