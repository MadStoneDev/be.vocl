-- Public full-text search over posts.
--
-- Adds a generated tsvector column derived from the post's plain-text content,
-- a GIN index for fast matching, and a SQL function that returns ranked,
-- publicly-visible post ids for a search query. The public visibility gate is
-- identical to getPublicPostsByTag / getPublicFrontPagePosts:
--   status='published' AND moderation_status='approved'
--   AND is_sensitive=false  (NSFW is NEVER surfaced publicly — hard rule)
--   AND exclude_from_public=false
--   AND author is_discoverable IS NOT false AND not restricted/banned.
-- Baking the gate into SQL keeps ranking and pagination correct over the
-- gated set (you can't rank-then-filter and still have stable pages).

-- 1. Generated tsvector column over the canonical plain-text content.
--    content->>'plain' and to_tsvector(regconfig, text) are both IMMUTABLE, so
--    this is valid in a STORED generated column and backfills existing rows.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content->>'plain', ''))
  ) STORED;

-- 2. GIN index for the @@ match.
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN (search_vector);

-- 3. Ranked public search. Returns post ids + relevance rank, gated + ordered
--    in SQL. Callers hydrate the full rows and preserve this order.
--    STABLE, not SECURITY DEFINER: intended to run via the service-role client
--    (like the other public getters), but safe to expose since it only ever
--    reads already-public rows.
CREATE OR REPLACE FUNCTION search_public_posts(q text, lim int DEFAULT 20, off int DEFAULT 0)
RETURNS TABLE (id uuid, rank real)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p.id,
         ts_rank(p.search_vector, websearch_to_tsquery('english', q)) AS rank
  FROM posts p
  JOIN profiles a ON a.id = p.author_id
  WHERE p.search_vector @@ websearch_to_tsquery('english', q)
    AND p.status = 'published'
    AND p.moderation_status = 'approved'
    AND p.is_sensitive = false
    AND p.exclude_from_public = false
    AND a.is_discoverable IS NOT FALSE
    AND (a.lock_status IS NULL OR a.lock_status NOT IN ('restricted', 'banned'))
  ORDER BY rank DESC, p.published_at DESC NULLS LAST
  LIMIT LEAST(GREATEST(lim, 1), 50)
  OFFSET GREATEST(off, 0);
$$;

GRANT EXECUTE ON FUNCTION search_public_posts(text, int, int) TO anon, authenticated, service_role;
