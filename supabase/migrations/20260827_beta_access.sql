-- Beta-access gate. Adds profiles.beta_access (admin-set only) and protects it
-- with the same privileged-column trigger as role/lock_status, so a user cannot
-- self-grant beta access via a profile update. The gate itself is env-driven in
-- the app: BETA_ACCESS_REQUIRED is set ONLY on the beta deployment; when present,
-- only admins or beta_access users may use the app (see src/lib/beta.ts).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS beta_access boolean NOT NULL DEFAULT false;

-- Recreate the privileged-column guard with beta_access added to the protected
-- set (the trigger already references this function — replacing it is enough).
CREATE OR REPLACE FUNCTION enforce_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  is_service_role boolean;
BEGIN
  is_service_role := (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );
  IF is_service_role THEN
    RETURN NEW;
  END IF;

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
  IF NEW.beta_access IS DISTINCT FROM OLD.beta_access THEN
    RAISE EXCEPTION 'Not authorized to change profiles.beta_access';
  END IF;

  RETURN NEW;
END;
$$;
