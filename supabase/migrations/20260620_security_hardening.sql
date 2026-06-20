-- ============================================================================
-- SECURITY HARDENING MIGRATION
-- ============================================================================
-- Fixes verified audit findings:
--   SEC-1  (CRITICAL) Privilege escalation via profiles UPDATE
--   SEC-5  (CRITICAL) PII tables with RLS disabled
--   SEC-9            Forgeable inserts (notifications.actor_id, audit_logs)
--   SEC-10           invite_codes world-readable; invite_code_uses forgeable
--   SEC-14 (partial) SECURITY DEFINER functions missing search_path
--
-- Notes on the service-role check used throughout:
--   The Supabase service role bypasses RLS, but BEFORE triggers still execute.
--   We therefore detect the service role from the JWT claims and allow it to
--   perform otherwise-privileged operations. authenticated/anon callers do not
--   carry role = 'service_role' in their JWT.
-- ============================================================================


-- ============================================================================
-- SEC-1: Prevent privilege escalation through the profiles UPDATE policy
-- ============================================================================
-- The "Users can update own profile" policy (USING auth.uid() = id) lets a user
-- update ANY column on their own row, including privileged moderation/role
-- columns. RLS cannot do per-column checks here, so we enforce it with a
-- BEFORE UPDATE trigger that rejects changes to privileged columns from any
-- caller that is not the service role.
--
-- Privileged columns (verified against schema):
--   role                    (00002_moderation_system.sql)
--   lock_status             (00002_moderation_system.sql)
--   banned_at               (00002_moderation_system.sql)
--   ban_reason              (00002_moderation_system.sql)
--   appeals_blocked         (00002_moderation_system.sql)
--   invite_codes_remaining  (20260205_invite_codes.sql)
--   is_verified             (present in live DB / database.types.ts)
--   verified_at             (present in live DB / database.types.ts)

CREATE OR REPLACE FUNCTION enforce_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_service_role boolean;
BEGIN
  -- Service role is allowed to change anything. Detect it from the JWT claims.
  is_service_role := (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

  IF is_service_role THEN
    RETURN NEW;
  END IF;

  -- Non-service callers may not alter any privileged column.
  -- Use IS DISTINCT FROM so NULL <-> value transitions are caught.
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not authorized to change profiles.role';
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Not authorized to change profiles.is_verified';
  END IF;

  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'Not authorized to change profiles.verified_at';
  END IF;

  IF NEW.lock_status IS DISTINCT FROM OLD.lock_status THEN
    RAISE EXCEPTION 'Not authorized to change profiles.lock_status';
  END IF;

  IF NEW.banned_at IS DISTINCT FROM OLD.banned_at THEN
    RAISE EXCEPTION 'Not authorized to change profiles.banned_at';
  END IF;

  IF NEW.ban_reason IS DISTINCT FROM OLD.ban_reason THEN
    RAISE EXCEPTION 'Not authorized to change profiles.ban_reason';
  END IF;

  IF NEW.appeals_blocked IS DISTINCT FROM OLD.appeals_blocked THEN
    RAISE EXCEPTION 'Not authorized to change profiles.appeals_blocked';
  END IF;

  IF NEW.invite_codes_remaining IS DISTINCT FROM OLD.invite_codes_remaining THEN
    RAISE EXCEPTION 'Not authorized to change profiles.invite_codes_remaining';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_privileged_columns ON profiles;
CREATE TRIGGER profiles_protect_privileged_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_profile_privileged_columns();


-- ============================================================================
-- SEC-5: Enable RLS on PII / internal tables that currently have it disabled
-- ============================================================================
-- These tables were created without RLS. Enabling RLS with no permissive policy
-- denies ALL access to authenticated/anon callers, while the service role
-- continues to bypass RLS (server-side email/admin jobs are unaffected).
-- Where a clear owner column exists we add a SELECT policy for the owner.
--
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY is idempotent (no error if already
-- enabled), so it is safe to re-run.

-- email_sends: no per-user owner (sent_by is the admin author) -> service-role only
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;

-- email_send_recipients: has recipient_id -> owner may read their own rows
ALTER TABLE email_send_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recipients can view own email rows" ON email_send_recipients;
CREATE POLICY "Recipients can view own email rows"
  ON email_send_recipients FOR SELECT
  USING (recipient_id = auth.uid());

-- email_template_customizations: admin/template config -> service-role only
ALTER TABLE email_template_customizations ENABLE ROW LEVEL SECURITY;

-- user_tags: targeting taxonomy, no per-user owner -> service-role only
ALTER TABLE user_tags ENABLE ROW LEVEL SECURITY;

-- user_tag_assignments: has user_id -> owner may read their own assignments
ALTER TABLE user_tag_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own tag assignments" ON user_tag_assignments;
CREATE POLICY "Users can view own tag assignments"
  ON user_tag_assignments FOR SELECT
  USING (user_id = auth.uid());

-- message_email_tracking: has recipient_id -> owner may read their own rows
ALTER TABLE message_email_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recipients can view own message email tracking" ON message_email_tracking;
CREATE POLICY "Recipients can view own message email tracking"
  ON message_email_tracking FOR SELECT
  USING (recipient_id = auth.uid());

-- pending_digest_notifications: has recipient_id -> owner may read their own rows
ALTER TABLE pending_digest_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recipients can view own pending digests" ON pending_digest_notifications;
CREATE POLICY "Recipients can view own pending digests"
  ON pending_digest_notifications FOR SELECT
  USING (recipient_id = auth.uid());


-- ============================================================================
-- SEC-9: Forgeable inserts
-- ============================================================================

-- notifications: the original INSERT policy only checked auth.uid() IS NOT NULL,
-- allowing any authenticated user to forge notifications with an arbitrary
-- actor_id. Constrain actor_id to the caller. (Server jobs use the service role
-- and bypass RLS, so legitimate system notifications are unaffected.)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications as themselves" ON notifications;
CREATE POLICY "Users can create notifications as themselves"
  ON notifications FOR INSERT
  WITH CHECK (actor_id = auth.uid());

-- audit_logs: the original INSERT policy used WITH CHECK (true), letting any
-- authenticated user forge audit records. Audit logs must only be written by
-- the service role, which bypasses RLS. Deny all authenticated inserts.
DROP POLICY IF EXISTS "Server can insert audit logs" ON audit_logs;
CREATE POLICY "Server can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (false);


-- ============================================================================
-- SEC-10: invite_codes world-readable + forgeable invite_code_uses inserts
-- ============================================================================

-- Remove the policy that let anyone read every invite code. Code validation at
-- signup is performed server-side via the use_invite_code() SECURITY DEFINER
-- function (service role), so removing this public SELECT does not break signup.
-- The owner ("Users can see own codes") and staff SELECT policies remain.
DROP POLICY IF EXISTS "Anyone can check invite codes" ON invite_codes;

-- invite_code_uses: original INSERT policy used WITH CHECK (true). Redemption is
-- done server-side via use_invite_code() (service role, bypasses RLS), so deny
-- all client inserts.
DROP POLICY IF EXISTS "System can insert code uses" ON invite_code_uses;
CREATE POLICY "System can insert code uses"
  ON invite_code_uses FOR INSERT
  WITH CHECK (false);


-- ============================================================================
-- SEC-14 (partial): Pin search_path on SECURITY DEFINER functions
-- ============================================================================
-- A SECURITY DEFINER function runs with the owner's privileges; an attacker who
-- can control search_path could shadow referenced objects. Pin search_path to a
-- trusted, explicit value. (check_trusted_user_promotion already sets it.)

ALTER FUNCTION handle_new_user()
  SET search_path = public, pg_temp;

ALTER FUNCTION is_conversation_member(uuid)
  SET search_path = public, pg_temp;

ALTER FUNCTION use_invite_code(text, uuid)
  SET search_path = public, pg_temp;

-- Community trigger functions (20260413_communities.sql / phase2)
ALTER FUNCTION community_member_count_trigger()
  SET search_path = public, pg_temp;

ALTER FUNCTION community_post_count_trigger()
  SET search_path = public, pg_temp;

ALTER FUNCTION community_add_owner_trigger()
  SET search_path = public, pg_temp;

ALTER FUNCTION community_join_request_apply_trigger()
  SET search_path = public, pg_temp;
