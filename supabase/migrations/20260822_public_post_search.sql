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

-- 1. Generated tsvector column over the post's plain text AND its image alt
--    text (both live in the content JSONB). content->>'x' and
--    to_tsvector(regconfig, text) are IMMUTABLE, so this is valid in a STORED
--    generated column and backfills existing rows. alt_texts is a JSON array;
--    ->>'alt_texts' serialises it to text and to_tsvector tokenises the words,
--    ignoring the brackets/quotes — so searching a word in an image's alt text
--    matches the post.
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(content->>'plain', '') || ' ' || coalesce(content->>'alt_texts', '')
    )
  ) STORED;

-- 2. GIN index for the @@ match.
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN (search_vector);

-- 3. Ranked public search. A post matches if the query hits its content/alt-text
--    vector OR it carries a tag whose name matches the query — so searching
--    "car" returns posts about cars whether the word is in the body, the alt
--    text, or a #car tag. Returns post ids + relevance rank, gated + ordered in
--    SQL (content matches rank above tag-only matches). Callers hydrate the full
--    rows and preserve this order.
--    STABLE, not SECURITY DEFINER: intended to run via the service-role client
--    (like the other public getters), but safe to expose since it only ever
--    reads already-public rows.
CREATE OR REPLACE FUNCTION search_public_posts(q text, lim int DEFAULT 20, off int DEFAULT 0)
RETURNS TABLE (id uuid, rank real)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH tsq AS (
    SELECT websearch_to_tsquery('english', q) AS query
  ),
  -- Posts carrying a tag whose name matches the query. Guarded on length so an
  -- empty/1-char query can't turn '%'||q||'%' into a match-everything wildcard.
  tagged AS (
    SELECT DISTINCT pt.post_id
    FROM post_tags pt
    JOIN tags t ON t.id = pt.tag_id
    WHERE char_length(btrim(q)) >= 2
      AND t.name ILIKE '%' || q || '%'
  )
  SELECT p.id,
         greatest(
           ts_rank(p.search_vector, (SELECT query FROM tsq)),
           CASE WHEN tg.post_id IS NOT NULL THEN 0.05::real ELSE 0::real END
         ) AS rank
  FROM posts p
  JOIN profiles a ON a.id = p.author_id
  LEFT JOIN tagged tg ON tg.post_id = p.id
  WHERE (p.search_vector @@ (SELECT query FROM tsq) OR tg.post_id IS NOT NULL)
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

-- 4. Public tag search with a PUBLIC post count. The tags.post_count column
--    counts all published posts including sensitive / members-only / hidden
--    ones, so surfacing it would leak that a hidden post exists (and mismatch
--    the tag page, which shows 0). This counts only publicly-visible posts and
--    drops (HAVING) any tag with none — so a tag whose only post is sensitive
--    never appears.
CREATE OR REPLACE FUNCTION search_public_tags(q text, lim int DEFAULT 12)
RETURNS TABLE (name text, public_post_count bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT t.name, count(*) AS public_post_count
  FROM tags t
  JOIN post_tags pt ON pt.tag_id = t.id
  JOIN posts p ON p.id = pt.post_id
  JOIN profiles a ON a.id = p.author_id
  WHERE char_length(btrim(q)) >= 1
    AND t.name ILIKE '%' || q || '%'
    AND p.status = 'published'
    AND p.moderation_status = 'approved'
    AND p.is_sensitive = false
    AND p.exclude_from_public = false
    AND a.is_discoverable IS NOT FALSE
    AND (a.lock_status IS NULL OR a.lock_status NOT IN ('restricted', 'banned'))
  GROUP BY t.name
  HAVING count(*) > 0
  ORDER BY public_post_count DESC
  LIMIT LEAST(GREATEST(lim, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION search_public_tags(text, int) TO anon, authenticated, service_role;
