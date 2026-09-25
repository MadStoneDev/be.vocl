-- be.vocl Plus: a processor-AGNOSTIC entitlement layer + per-user edition prefs.
--
-- Design (see the hybrid/segregation plan doc): entitlements are an internal
-- record of "this user has product X, active until Y", granted TODAY by the
-- Paddle webhook but grantable later by a different processor (e.g. an
-- adult-friendly PSP on the segregated adult product) with no schema change.
-- Entitlement is intentionally NOT a boolean on profiles, so no privileged
-- profiles column and no change to enforce_profile_privileged_columns().

-- ---------------------------------------------------------------------------
-- entitlements: one row per (user, product). Written only by a service-role
-- client (the webhook); readable by the owner.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entitlements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  product       text NOT NULL,                       -- e.g. 'plus'
  status        text NOT NULL DEFAULT 'pending',     -- active | canceled | past_due | expired | pending
  processor     text,                                -- e.g. 'paddle' (which processor granted it)
  processor_ref text,                                -- processor subscription/transaction id
  granted_at    timestamptz,
  expires_at    timestamptz,                         -- null = no explicit expiry (check status)
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_status_chk
    CHECK (status IN ('active', 'canceled', 'past_due', 'expired', 'pending')),
  CONSTRAINT entitlements_user_product_uniq UNIQUE (user_id, product)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_lookup
  ON entitlements (user_id, product, status);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

-- Owner can read their own entitlements (for the Settings UI / grace banner).
-- No INSERT/UPDATE/DELETE policy => regular users cannot write; only the
-- service-role client (webhook) can, and it bypasses RLS.
DROP POLICY IF EXISTS entitlements_select_own ON entitlements;
CREATE POLICY entitlements_select_own ON entitlements
  FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Per-user edition preferences on profiles. These are USER-EDITABLE (like
-- accent_color / feed_layout) — the server's resolveEdition() enforces which
-- ones actually render based on the Plus entitlement above, so storing a Plus
-- edition here while unentitled is harmless (it falls back to the default).
-- customAccent reuses the existing profiles.accent_color column.
-- ---------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS reading_edition        text    NOT NULL DEFAULT 'late-edition',
  ADD COLUMN IF NOT EXISTS reading_edition_light  text,
  ADD COLUMN IF NOT EXISTS reading_edition_dark   text,
  ADD COLUMN IF NOT EXISTS match_system_theme     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paper_texture          boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS always_read_in_my_edition boolean NOT NULL DEFAULT false,
  -- profile_edition = what the OWNER chose for their public profile (the handoff's
  -- profileEditionPreferred). resolveEdition() downgrades it to the default when
  -- the owner isn't Plus-entitled (except the never-paywall editions).
  ADD COLUMN IF NOT EXISTS profile_edition        text    NOT NULL DEFAULT 'late-edition',
  ADD COLUMN IF NOT EXISTS custom_nameplate_font  text,   -- Plus; must be in the curated list
  ADD COLUMN IF NOT EXISTS masthead_line          varchar(60); -- Plus to set; goes through the bio text filter
