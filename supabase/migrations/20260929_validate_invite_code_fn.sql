-- Fix: signup invite-code validation broke after SEC-10 (20260620_security_hardening.sql)
-- dropped the public "Anyone can check invite codes" SELECT policy. That migration
-- assumed validation happened via the use_invite_code() SECURITY DEFINER RPC, but
-- validateInviteCode() (src/actions/invites.ts) still does a DIRECT table read under
-- the anonymous signup client — which now returns zero rows, so every valid code
-- reports "Invalid invite code" at signup.
--
-- Provide a SECURITY DEFINER validator so signup can check a code the user already
-- holds WITHOUT re-exposing the whole table to anon (the thing SEC-10 removed). It
-- returns only a validity verdict + reason for the exact code supplied, never a
-- listing, so codes stay non-enumerable.

CREATE OR REPLACE FUNCTION validate_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v invite_codes%ROWTYPE;
BEGIN
  SELECT * INTO v FROM invite_codes WHERE code = upper(trim(p_code)) LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid invite code');
  END IF;
  IF v.is_revoked THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite code has been revoked');
  END IF;
  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite code has expired');
  END IF;
  IF v.max_uses IS NOT NULL AND COALESCE(v.uses, 0) >= v.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'This invite code has reached its maximum uses');
  END IF;

  RETURN jsonb_build_object('valid', true);
END;
$$;

-- Anon (pre-registration signup) and authenticated users may validate a code they
-- hold. SECURITY DEFINER means the function's own read bypasses RLS.
REVOKE ALL ON FUNCTION validate_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_invite_code(text) TO anon, authenticated;
