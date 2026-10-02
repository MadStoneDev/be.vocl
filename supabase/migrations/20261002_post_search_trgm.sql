-- Post search speed (5d). searchPosts matches post text with ILIKE '%term%' on
-- the JSONB content, which was a full table scan (5–9s). Keep ILIKE — it
-- preserves the current substring/mid-word matching ("foo" finds "food"), which
-- tsvector full-text search would break (FTS only prefix-matches word starts).
-- Make it fast with pg_trgm trigram GIN indexes on the searched text instead.
--
-- Why pg_trgm, not search_vector/tsvector: tsvector would require `food:*` prefix
-- queries and still wouldn't match mid-word, changing behaviour. pg_trgm indexes
-- the exact ILIKE the app already runs, so results are identical — just indexed.
--
-- Partial (status = 'published') to match the search query's filter and keep the
-- index small.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_posts_content_plain_trgm
  ON posts USING gin ((content->>'plain') gin_trgm_ops)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_posts_content_caption_trgm
  ON posts USING gin ((content->>'caption_html') gin_trgm_ops)
  WHERE status = 'published';
