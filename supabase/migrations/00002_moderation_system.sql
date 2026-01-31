-- be.vocl Moderation System Migration
-- Run this in your Supabase SQL Editor after 00001_initial_schema.sql

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE lock_status AS ENUM ('unlocked', 'restricted', 'banned');
CREATE TYPE report_subject AS ENUM ('minor_safety', 'non_consensual', 'harassment', 'spam', 'illegal', 'other');
CREATE TYPE report_source AS ENUM ('user_report', 'auto_moderation', 'promise_declined');
CREATE TYPE report_status AS ENUM ('pending', 'reviewing', 'resolved_ban', 'resolved_restrict', 'resolved_dismissed');
CREATE TYPE appeal_status AS ENUM ('pending', 'approved', 'denied', 'blocked');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');

-- ============================================================================
-- UPDATE PROFILES TABLE
-- ============================================================================

-- Role: 0 = user, 5 = moderator, 10 = admin
ALTER TABLE profiles ADD COLUMN role INTEGER DEFAULT 0;

-- Lock status for moderation
ALTER TABLE profiles ADD COLUMN lock_status lock_status DEFAULT 'unlocked';

-- Promise acceptance tracking
ALTER TABLE profiles ADD COLUMN promise_accepted_at TIMESTAMPTZ;

-- Ban tracking
ALTER TABLE profiles ADD COLUMN banned_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN ban_reason TEXT;

-- Appeals blocking (prevents user from submitting new appeals)
ALTER TABLE profiles ADD COLUMN appeals_blocked BOOLEAN DEFAULT false;

-- ============================================================================
-- UPDATE POSTS TABLE
-- ============================================================================

-- Moderation status for content filtering
ALTER TABLE posts ADD COLUMN moderation_status moderation_status DEFAULT 'approved';
ALTER TABLE posts ADD COLUMN moderation_reason TEXT;
ALTER TABLE posts ADD COLUMN moderated_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN moderated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Index for filtering moderated posts
CREATE INDEX idx_posts_moderation ON posts(moderation_status) WHERE moderation_status != 'approved';

-- ============================================================================
-- REPORTS TABLE
-- ============================================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who reported
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Who/what is being reported
  reported_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

  -- Report details
  subject report_subject NOT NULL,
  comments TEXT,
  source report_source DEFAULT 'user_report',

  -- Status and assignment
  status report_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Resolution
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reports
CREATE INDEX idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_assigned ON reports(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- APPEALS TABLE
-- ============================================================================

CREATE TABLE appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is appealing
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Related report (optional)
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,

  -- Appeal details
  reason TEXT NOT NULL,

  -- Status
  status appeal_status DEFAULT 'pending',

  -- Review
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for appeals
CREATE INDEX idx_appeals_user ON appeals(user_id);
CREATE INDEX idx_appeals_status ON appeals(status, created_at DESC);

-- ============================================================================
-- BANNED IPS TABLE
-- ============================================================================

CREATE TABLE banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,
  banned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for IP lookups
CREATE INDEX idx_banned_ips_address ON banned_ips(ip_address);

-- ============================================================================
-- DATA EXPORT REQUESTS TABLE
-- ============================================================================

CREATE TABLE data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Status tracking
  status export_status DEFAULT 'pending',

  -- File details (stored in R2)
  file_url TEXT,
  file_size_bytes BIGINT,
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Index for user export requests
CREATE INDEX idx_export_requests_user ON data_export_requests(user_id, created_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for reports
CREATE TRIGGER reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;

-- Reports: Only staff can view all, users can create
CREATE POLICY "Staff can view all reports"
  ON reports FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 5)
  );
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND reporter_id = auth.uid()
  );
CREATE POLICY "Staff can update reports"
  ON reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 5)
  );

-- Appeals: Users can view/create their own, staff can view/update all
CREATE POLICY "Users can view own appeals"
  ON appeals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Staff can view all appeals"
  ON appeals FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 5)
  );
CREATE POLICY "Users can create appeals"
  ON appeals FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
  );
CREATE POLICY "Staff can update appeals"
  ON appeals FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 5)
  );

-- Banned IPs: Only admins
CREATE POLICY "Admins can manage banned IPs"
  ON banned_ips FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 10)
  );

-- Data export requests: Users can view/create their own
CREATE POLICY "Users can view own export requests"
  ON data_export_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create export requests"
  ON data_export_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- UPDATE POSTS RLS FOR MODERATION
-- ============================================================================

-- Drop existing select policy and recreate with moderation check
DROP POLICY IF EXISTS "Published posts are viewable (with block check)" ON posts;

CREATE POLICY "Published posts are viewable (with moderation check)"
  ON posts FOR SELECT USING (
    (
      -- Post is approved and published, or user owns it
      (status = 'published' AND moderation_status = 'approved')
      OR author_id = auth.uid()
      -- Staff can see all posts
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 5)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE blocker_id = auth.uid() AND blocked_id = posts.author_id
    )
  );

-- ============================================================================
-- ENABLE REALTIME FOR NEW TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE reports;
ALTER PUBLICATION supabase_realtime ADD TABLE appeals;
