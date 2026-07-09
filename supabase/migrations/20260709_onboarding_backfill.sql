-- Onboarding gate backfill.
--
-- The onboarding wizard gates solely on profiles.onboarding_completed
-- (see checkOnboardingStatus in src/actions/profile.ts). That column was added
-- out-of-band and defaults to NULL/false, so every PRE-EXISTING account gets
-- force-routed through the wizard on next load — even long-established users.
--
-- Ensure the column exists, then mark every account that exists at migration
-- time as already onboarded. New signups still default to false and go through
-- onboarding normally.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

UPDATE profiles
  SET onboarding_completed = true
  WHERE onboarding_completed IS NOT TRUE;
