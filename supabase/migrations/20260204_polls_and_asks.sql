-- Migration: Add Polls and Asks features
-- Run this in Supabase SQL Editor

-- ============================================================================
-- POLLS
-- ============================================================================

-- Table to track poll votes (one vote per user per poll)
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL CHECK (option_index >= 0 AND option_index < 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each user can only vote once per poll
  UNIQUE(post_id, user_id)
);

-- Index for efficient vote counting
CREATE INDEX IF NOT EXISTS idx_poll_votes_post_id ON poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

-- RLS policies for poll_votes
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Users can view all votes (for counting)
CREATE POLICY "Anyone can view poll votes" ON poll_votes
  FOR SELECT USING (true);

-- Users can only create their own votes
CREATE POLICY "Users can vote in polls" ON poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own votes (change vote)
CREATE POLICY "Users can delete own votes" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- ASKS
-- ============================================================================

-- Table to store pending asks (before they're answered)
CREATE TABLE IF NOT EXISTS asks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- NULL if anonymous
  question TEXT NOT NULL CHECK (char_length(question) <= 500),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'deleted')),
  answered_post_id UUID REFERENCES posts(id) ON DELETE SET NULL, -- The post created when answered
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_asks_recipient_id ON asks(recipient_id);
CREATE INDEX IF NOT EXISTS idx_asks_sender_id ON asks(sender_id);
CREATE INDEX IF NOT EXISTS idx_asks_status ON asks(status);

-- RLS policies for asks
ALTER TABLE asks ENABLE ROW LEVEL SECURITY;

-- Recipients can view asks sent to them
CREATE POLICY "Users can view asks sent to them" ON asks
  FOR SELECT USING (auth.uid() = recipient_id);

-- Senders can view their own asks (if not anonymous)
CREATE POLICY "Users can view asks they sent" ON asks
  FOR SELECT USING (auth.uid() = sender_id AND is_anonymous = false);

-- Anyone authenticated can send asks
CREATE POLICY "Users can send asks" ON asks
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() != recipient_id -- Can't ask yourself
  );

-- Recipients can update asks (mark as answered/deleted)
CREATE POLICY "Recipients can update asks" ON asks
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Recipients can delete asks
CREATE POLICY "Recipients can delete asks" ON asks
  FOR DELETE USING (auth.uid() = recipient_id);

-- ============================================================================
-- PROFILE SETTINGS FOR ASKS
-- ============================================================================

-- Add ask settings to profiles (if columns don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'allow_asks') THEN
    ALTER TABLE profiles ADD COLUMN allow_asks BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'allow_anonymous_asks') THEN
    ALTER TABLE profiles ADD COLUMN allow_anonymous_asks BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- ============================================================================
-- UPDATE PostType ENUM (if using enum in database)
-- ============================================================================
-- Note: If you're using a TEXT type for post_type, you don't need this.
-- If using a PostgreSQL ENUM, you'll need to add new values:

-- ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'poll';
-- ALTER TYPE post_type ADD VALUE IF NOT EXISTS 'ask';

-- ============================================================================
-- NOTIFICATION TYPES
-- ============================================================================
-- Add new notification types for asks (if using enum)
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ask';
-- ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ask_answered';
