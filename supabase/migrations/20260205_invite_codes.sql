-- ============================================================================
-- INVITE CODE SYSTEM
-- ============================================================================
-- Fancy invite code system for beta access control
-- - Admins can generate unlimited codes
-- - Users can generate limited codes to invite friends
-- - Track invite chains (who invited whom)
-- - Codes can be single-use, multi-use, or unlimited
-- - Codes can expire

-- Invite codes table
CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The actual code (e.g., "VOCL-A1B2-C3D4")
  code text UNIQUE NOT NULL,

  -- Who created this code (null for system-generated)
  creator_id uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Usage limits
  max_uses integer, -- null = unlimited
  uses integer DEFAULT 0,

  -- Expiration
  expires_at timestamptz, -- null = never expires

  -- Status
  is_revoked boolean DEFAULT false,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Optional note (for admin reference)
  note text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Track code usage / redemptions
CREATE TABLE IF NOT EXISTS invite_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  code_id uuid NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamp of when the code was used
  used_at timestamptz DEFAULT now(),

  -- Unique constraint: one user can only use one invite code
  UNIQUE(user_id)
);

-- Add invite tracking to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invite_code_used uuid REFERENCES invite_codes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invite_codes_remaining integer DEFAULT 0; -- Users start with 0, Trusted Users get 3

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_creator ON invite_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires ON invite_codes(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_code ON invite_code_uses(code_id);
CREATE INDEX IF NOT EXISTS idx_invite_code_uses_user ON invite_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by);

-- RLS Policies
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_code_uses ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a code is valid (for signup)
CREATE POLICY "Anyone can check invite codes"
  ON invite_codes FOR SELECT
  USING (true);

-- Users can see their own created codes
CREATE POLICY "Users can see own codes"
  ON invite_codes FOR SELECT
  USING (creator_id = auth.uid());

-- Staff can see all codes
CREATE POLICY "Staff can see all codes"
  ON invite_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role >= 5
    )
  );

-- Users can create codes (if they have remaining)
CREATE POLICY "Users can create codes"
  ON invite_codes FOR INSERT
  WITH CHECK (
    creator_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.invite_codes_remaining > 0
    )
  );

-- Staff can create unlimited codes
CREATE POLICY "Staff can create codes"
  ON invite_codes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role >= 5
    )
  );

-- Staff can update/revoke codes
CREATE POLICY "Staff can update codes"
  ON invite_codes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role >= 5
    )
  );

-- Users can revoke their own codes
CREATE POLICY "Users can revoke own codes"
  ON invite_codes FOR UPDATE
  USING (creator_id = auth.uid())
  WITH CHECK (creator_id = auth.uid());

-- Code uses - users can see who used their codes
CREATE POLICY "Users can see own code uses"
  ON invite_code_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invite_codes
      WHERE invite_codes.id = invite_code_uses.code_id
      AND invite_codes.creator_id = auth.uid()
    )
  );

-- Staff can see all code uses
CREATE POLICY "Staff can see all code uses"
  ON invite_code_uses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role >= 5
    )
  );

-- System can insert code uses (during registration)
CREATE POLICY "System can insert code uses"
  ON invite_code_uses FOR INSERT
  WITH CHECK (true);

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars (0,O,1,I)
  result text := 'VOCL-';
  i integer;
BEGIN
  -- Generate format: VOCL-XXXX-XXXX
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use an invite code
CREATE OR REPLACE FUNCTION use_invite_code(
  p_code text,
  p_user_id uuid
) RETURNS jsonb AS $$
DECLARE
  v_code_record invite_codes%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Find the code
  SELECT * INTO v_code_record
  FROM invite_codes
  WHERE code = upper(p_code)
  FOR UPDATE; -- Lock the row

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if revoked
  IF v_code_record.is_revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has been revoked');
  END IF;

  -- Check if expired
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has expired');
  END IF;

  -- Check if max uses reached
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.uses >= v_code_record.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'This invite code has reached its maximum uses');
  END IF;

  -- Check if user already used a code
  IF EXISTS (SELECT 1 FROM invite_code_uses WHERE user_id = p_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used an invite code');
  END IF;

  -- Use the code
  UPDATE invite_codes
  SET uses = uses + 1, updated_at = now()
  WHERE id = v_code_record.id;

  -- Record the use
  INSERT INTO invite_code_uses (code_id, user_id)
  VALUES (v_code_record.id, p_user_id);

  -- Update the user's profile
  UPDATE profiles
  SET
    invited_by = v_code_record.creator_id,
    invite_code_used = v_code_record.id
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'code_id', v_code_record.id,
    'invited_by', v_code_record.creator_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
