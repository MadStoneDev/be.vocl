-- Profile-level "posts NSFW / mature content" flag.
--
-- profiles previously had only viewer-side sensitivity prefs
-- (show_sensitive_posts, blur_sensitive_by_default) and a per-post is_sensitive
-- flag — nothing that marks an ACCOUNT as an NSFW account. Without it, follow
-- suggestions (getSuggestedUsers) surface NSFW accounts to everyone, including
-- during onboarding.
--
-- This adds an account-level flag that discovery surfaces filter out.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_nsfw boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.is_nsfw IS
  'Account primarily posts NSFW/mature content. Excluded from follow suggestions and other discovery surfaces.';
