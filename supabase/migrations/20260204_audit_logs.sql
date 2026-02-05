-- Audit Logs for Admin Actions
-- This tracks all admin/moderator actions for accountability

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_username text, -- Denormalized for historical record
  actor_role integer NOT NULL,

  -- What action was performed
  action text NOT NULL, -- e.g., 'ban_user', 'change_role', 'resolve_report'

  -- Target of the action (if applicable)
  target_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  target_user_username text, -- Denormalized for historical record
  target_post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  target_report_id uuid,
  target_flag_id uuid,
  target_appeal_id uuid,

  -- Details of the action
  details jsonb DEFAULT '{}', -- Additional context (old_role, new_role, reason, etc.)

  -- IP address (if available)
  ip_address text,

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Index for querying by actor
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);

-- Index for querying by target user
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user ON audit_logs(target_user_id);

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index for querying by date
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role >= 10 -- Admin or higher
    )
  );

-- Audit logs are insert-only (no updates or deletes)
-- Only server can insert (via service role)
CREATE POLICY "Server can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Prevent updates
CREATE POLICY "No updates to audit logs"
  ON audit_logs FOR UPDATE
  USING (false);

-- Prevent deletes
CREATE POLICY "No deletes from audit logs"
  ON audit_logs FOR DELETE
  USING (false);
