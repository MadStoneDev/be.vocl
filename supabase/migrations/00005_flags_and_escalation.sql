-- be.vocl Flags and Escalation Migration
-- Reports = against users
-- Flags = against posts
-- Run this AFTER 00004_add_escalated_status.sql

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE flag_subject AS ENUM ('minor_safety', 'non_consensual', 'harassment', 'spam', 'illegal', 'copyright', 'misinformation', 'other');
CREATE TYPE flag_status AS ENUM ('pending', 'reviewing', 'escalated', 'resolved_removed', 'resolved_flagged', 'resolved_dismissed');

-- ============================================================================
-- FLAGS TABLE (for posts)
-- ============================================================================

CREATE TABLE flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who flagged
  flagger_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- What post is being flagged
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

  -- Flag details
  subject flag_subject NOT NULL,
  comments TEXT,

  -- Status and assignment
  status flag_status DEFAULT 'pending',
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_role INTEGER DEFAULT 3, -- Minimum role level to handle (starts at Junior Mod)

  -- Escalation tracking
  escalated_from UUID REFERENCES flags(id) ON DELETE SET NULL,
  escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,

  -- Resolution
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for flags
CREATE INDEX idx_flags_status ON flags(status, created_at DESC);
CREATE INDEX idx_flags_post ON flags(post_id);
CREATE INDEX idx_flags_assigned ON flags(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_flags_assigned_role ON flags(assigned_role, status) WHERE status IN ('pending', 'reviewing', 'escalated');

-- ============================================================================
-- ADD ESCALATION TO REPORTS TABLE
-- ============================================================================

-- Add escalation columns to existing reports table
ALTER TABLE reports ADD COLUMN assigned_role INTEGER DEFAULT 3;
ALTER TABLE reports ADD COLUMN escalated_from UUID REFERENCES reports(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN escalated_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE reports ADD COLUMN escalated_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN escalation_reason TEXT;

-- Index for role-based assignment on open reports
CREATE INDEX idx_reports_assigned_role ON reports(assigned_role, status);

-- ============================================================================
-- AUTO-PROMOTION FUNCTION FOR TRUSTED USER
-- ============================================================================

-- Function to check and promote user to Trusted after 10 posts
CREATE OR REPLACE FUNCTION check_trusted_user_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  post_count INTEGER;
  current_role INTEGER;
BEGIN
  -- Only check on new published posts
  IF NEW.status = 'published' THEN
    -- Get current role
    SELECT role INTO current_role FROM profiles WHERE id = NEW.author_id;

    -- Only promote if they're still a regular user (role 0)
    IF current_role = 0 THEN
      -- Count published posts
      SELECT COUNT(*) INTO post_count
      FROM posts
      WHERE author_id = NEW.author_id
      AND status = 'published';

      -- Promote to Trusted User (role 1) after 10 posts
      IF post_count >= 10 THEN
        UPDATE profiles
        SET role = 1, updated_at = NOW()
        WHERE id = NEW.author_id AND role = 0;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for auto-promotion
CREATE TRIGGER check_trusted_user_on_post
  AFTER INSERT OR UPDATE OF status ON posts
  FOR EACH ROW
  EXECUTE FUNCTION check_trusted_user_promotion();

-- ============================================================================
-- ESCALATION HISTORY TABLE
-- ============================================================================

CREATE TABLE escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was escalated (one of these will be set)
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  flag_id UUID REFERENCES flags(id) ON DELETE CASCADE,

  -- Escalation details
  from_role INTEGER NOT NULL,
  to_role INTEGER NOT NULL,
  escalated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one type is set
  CONSTRAINT escalation_type_check CHECK (
    (report_id IS NOT NULL AND flag_id IS NULL) OR
    (report_id IS NULL AND flag_id IS NOT NULL)
  )
);

CREATE INDEX idx_escalation_history_report ON escalation_history(report_id) WHERE report_id IS NOT NULL;
CREATE INDEX idx_escalation_history_flag ON escalation_history(flag_id) WHERE flag_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for flags
CREATE TRIGGER flags_updated_at BEFORE UPDATE ON flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_history ENABLE ROW LEVEL SECURITY;

-- Flags: Staff can view based on their role level
CREATE POLICY "Staff can view flags at their level"
  ON flags FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role >= 3
      AND role >= flags.assigned_role
    )
  );

CREATE POLICY "Users can create flags"
  ON flags FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND flagger_id = auth.uid()
  );

CREATE POLICY "Staff can update flags at their level"
  ON flags FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role >= 3
      AND role >= flags.assigned_role
    )
  );

-- Escalation history: Staff can view
CREATE POLICY "Staff can view escalation history"
  ON escalation_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 3)
  );

CREATE POLICY "Staff can create escalation records"
  ON escalation_history FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role >= 3)
  );

-- ============================================================================
-- UPDATE REPORTS RLS FOR ROLE-BASED ACCESS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Staff can view all reports" ON reports;
DROP POLICY IF EXISTS "Staff can update reports" ON reports;

-- Recreate with role-based access
CREATE POLICY "Staff can view reports at their level"
  ON reports FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role >= 3
      AND role >= COALESCE(reports.assigned_role, 3)
    )
  );

CREATE POLICY "Staff can update reports at their level"
  ON reports FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role >= 3
      AND role >= COALESCE(reports.assigned_role, 3)
    )
  );

-- ============================================================================
-- ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE flags;
ALTER PUBLICATION supabase_realtime ADD TABLE escalation_history;
