-- Adult-content wall: a per-post `is_adult` flag that is a STRICTER sibling of
-- `is_sensitive`. It exists so legal sexual content is cleanly identifiable and
-- separable from the SFW feed — the seam for the future SFW/adult product split
-- (see the segregation plan doc). Unlike `is_sensitive` (soft, blur-to-reveal),
-- `is_adult` is hard-gated at query time to viewers who are verified 21+ and
-- opted in (enforced in the app: getFeedPosts / recommendations / public queries).
--
-- Invariants (defense in depth at the DB level):
--   * adult content is ALWAYS sensitive (so all sensitive-handling applies), and
--   * adult content is NEVER public (same rule the audience trigger already has).

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_adult boolean NOT NULL DEFAULT false;

-- Extend the audience sync trigger: an adult post implies sensitive and is
-- forced out of 'public'. Mirrors the existing is_sensitive rule.
CREATE OR REPLACE FUNCTION sync_post_audience()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Adult content is inherently sensitive — force the sensitive flag on so every
  -- existing sensitive code path (blur overlay, discovery opt-in, public exclusion)
  -- also covers it.
  IF NEW.is_adult IS TRUE THEN
    NEW.is_sensitive := true;
  END IF;
  -- Hard rule: sensitive/adult is never public. Bump such a public post to members.
  IF (NEW.is_sensitive IS TRUE OR NEW.is_adult IS TRUE) AND NEW.audience = 'public' THEN
    NEW.audience := 'members';
  END IF;
  -- exclude_from_public is the public/not-public mirror consumed by every existing
  -- public surface.
  NEW.exclude_from_public := (NEW.audience <> 'public');
  RETURN NEW;
END;
$$;

-- Trigger definition is unchanged, but re-assert it so this migration is
-- self-contained if applied against a fresh copy.
DROP TRIGGER IF EXISTS posts_sync_audience ON posts;
CREATE TRIGGER posts_sync_audience
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION sync_post_audience();

-- Make the adult gate cheap on feed/list queries that add `.eq('is_adult', false)`.
CREATE INDEX IF NOT EXISTS idx_posts_is_adult
  ON posts (is_adult, status, published_at DESC);
