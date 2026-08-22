-- Three-way post audience: public / members / followers.
--
-- Until now audience was a single boolean, exclude_from_public:
--   false = Public (anyone, logged-out included)
--   true  = Members-only (any logged-in be.vocl user)
-- This adds a real third tier — Followers-only (only accounts that follow the
-- author) — via a new `audience` enum that becomes the source of truth.
--
-- exclude_from_public is KEPT and auto-synced (true whenever audience <> 'public')
-- so every existing public surface (sitemap, RSS, discover, profile, search) keeps
-- working with no change — 'members' and 'followers' both read as "not public".
-- The follower gate is layered on top only where it's new (single post, profile,
-- feed, getPostById).

CREATE TYPE post_audience AS ENUM ('public', 'members', 'followers');

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS audience post_audience NOT NULL DEFAULT 'members';

-- Backfill from the existing boolean. Every current post is public or members;
-- followers is brand new, so nothing maps to it.
UPDATE posts SET audience = CASE
  WHEN exclude_from_public THEN 'members'::post_audience
  ELSE 'public'::post_audience
END;

-- Keep exclude_from_public derived from audience, and enforce the hard rule at the
-- DB level (defense in depth — the app enforces it too): sensitive/NSFW content is
-- NEVER public. Runs on every insert/update so the invariant holds no matter which
-- code path writes the row.
CREATE OR REPLACE FUNCTION sync_post_audience()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Hard rule: sensitive is never public. Bump a public+sensitive post to members.
  IF NEW.is_sensitive IS TRUE AND NEW.audience = 'public' THEN
    NEW.audience := 'members';
  END IF;
  -- exclude_from_public is the public/not-public mirror consumed by every existing
  -- public surface.
  NEW.exclude_from_public := (NEW.audience <> 'public');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS posts_sync_audience ON posts;
CREATE TRIGGER posts_sync_audience
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_audience();

-- Partial index to make the followers-only gate cheap on list queries.
CREATE INDEX IF NOT EXISTS idx_posts_followers_audience
  ON posts (author_id, published_at DESC)
  WHERE audience = 'followers' AND status = 'published';
