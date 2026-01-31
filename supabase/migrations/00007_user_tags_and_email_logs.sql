-- User Tags and Email Logs Migration
-- Adds user tagging for email grouping and email send tracking

-- ============================================================================
-- USER TAGS
-- ============================================================================

CREATE TABLE user_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#5B9A8B',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_tag_assignments (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES user_tags(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX idx_user_tag_assignments_user ON user_tag_assignments(user_id);
CREATE INDEX idx_user_tag_assignments_tag ON user_tag_assignments(tag_id);

-- ============================================================================
-- EMAIL LOGS
-- ============================================================================

CREATE TYPE email_template_type AS ENUM (
  'announcement',
  'founder_message',
  'welcome',
  'magic_link',
  'password_reset',
  'follow',
  'like',
  'comment',
  'reblog',
  'message',
  'mention',
  'digest'
);

CREATE TABLE email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type email_template_type NOT NULL,
  subject TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_filter JSONB, -- Stores filter criteria (all, tag_ids, user_ids)
  custom_content JSONB, -- Stores custom content used
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' -- pending, sending, completed, failed
);

CREATE TABLE email_send_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email_address TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error TEXT
);

CREATE INDEX idx_email_send_recipients_send ON email_send_recipients(email_send_id);
CREATE INDEX idx_email_sends_created ON email_sends(created_at DESC);

-- ============================================================================
-- EMAIL TEMPLATE CUSTOMIZATIONS
-- ============================================================================

CREATE TABLE email_template_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type email_template_type UNIQUE NOT NULL,
  customizations JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ============================================================================
-- SEED DEFAULT TAGS
-- ============================================================================

INSERT INTO user_tags (name, description, color) VALUES
  ('beta-tester', 'Early beta testers', '#8B5CF6'),
  ('premium', 'Premium/paid users', '#F59E0B'),
  ('creator', 'Content creators', '#EC4899'),
  ('staff', 'Staff members', '#EF4444'),
  ('newsletter', 'Opted in to newsletter', '#10B981');

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_tags IS 'Tags for grouping users for email targeting';
COMMENT ON TABLE email_sends IS 'Log of bulk email sends';
COMMENT ON TABLE email_template_customizations IS 'Custom overrides for email templates';
