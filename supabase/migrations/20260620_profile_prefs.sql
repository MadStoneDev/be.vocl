-- Per-profile accent color (Tumblr-style blog theming) + feed layout preference.
-- These are non-privileged, user-editable own-profile columns. The existing profile
-- UPDATE RLS policy covers them, and the SEC trigger only blocks role/verification/ban
-- columns, so no policy change is needed.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS feed_layout text NOT NULL DEFAULT 'reader';
