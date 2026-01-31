-- Email Preferences Migration
-- Adds email notification preferences to profiles

-- ============================================================================
-- EMAIL FREQUENCY ENUM
-- ============================================================================

CREATE TYPE email_frequency AS ENUM ('immediate', 'daily', 'off');

-- ============================================================================
-- ADD EMAIL PREFERENCES TO PROFILES
-- ============================================================================

ALTER TABLE profiles
  -- Email notification toggles
  ADD COLUMN email_likes BOOLEAN DEFAULT false,
  ADD COLUMN email_comments BOOLEAN DEFAULT true,
  ADD COLUMN email_reblogs BOOLEAN DEFAULT false,
  ADD COLUMN email_follows BOOLEAN DEFAULT true,
  ADD COLUMN email_mentions BOOLEAN DEFAULT true,
  ADD COLUMN email_messages BOOLEAN DEFAULT true,

  -- Email frequency setting
  ADD COLUMN email_frequency email_frequency DEFAULT 'immediate',

  -- Message email throttling (last email sent per sender)
  ADD COLUMN last_message_email_at TIMESTAMPTZ;

-- ============================================================================
-- MESSAGE EMAIL TRACKING (per conversation/sender)
-- ============================================================================

-- Track when we last sent a message notification email for each conversation
CREATE TABLE message_email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  last_email_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_new_conversation BOOLEAN DEFAULT true,
  UNIQUE(recipient_id, sender_id)
);

CREATE INDEX idx_message_email_tracking_recipient ON message_email_tracking(recipient_id);

-- ============================================================================
-- PENDING DIGEST NOTIFICATIONS
-- ============================================================================

-- Store notifications that should be sent in daily digest
CREATE TABLE pending_digest_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  actor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID,
  message_preview TEXT,
  conversation_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_digest_recipient ON pending_digest_notifications(recipient_id);
CREATE INDEX idx_pending_digest_created ON pending_digest_notifications(created_at);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN profiles.email_likes IS 'Send email when someone likes your post';
COMMENT ON COLUMN profiles.email_comments IS 'Send email when someone comments on your post';
COMMENT ON COLUMN profiles.email_reblogs IS 'Send email when someone reblogs your post';
COMMENT ON COLUMN profiles.email_follows IS 'Send email when someone follows you';
COMMENT ON COLUMN profiles.email_mentions IS 'Send email when someone mentions you';
COMMENT ON COLUMN profiles.email_messages IS 'Send email when you receive a message';
COMMENT ON COLUMN profiles.email_frequency IS 'How often to send notification emails: immediate, daily digest, or off';
