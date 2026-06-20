-- Performance pass: denormalized engagement counters + supporting indexes.
-- Replaces the feed's N+1 count queries (3*N likes/comments/reblogs per page,
-- plus per-author follower counts) with maintained counter columns.
-- Idempotent: safe to run multiple times.

-- ============================================================================
-- 1. COUNTER COLUMNS
-- ============================================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS like_count int NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comment_count int NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS reblog_count int NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS follower_count int NOT NULL DEFAULT 0;

-- ============================================================================
-- 2. TRIGGER FUNCTIONS + TRIGGERS
-- ============================================================================

-- Likes -> posts.like_count
CREATE OR REPLACE FUNCTION trg_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS likes_count_trigger ON likes;
CREATE TRIGGER likes_count_trigger
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION trg_likes_count();

-- Comments -> posts.comment_count
-- NOTE: matches the prior count query which counted ALL comment rows with no
-- soft-delete filter, so every row is counted regardless of any delete flag.
CREATE OR REPLACE FUNCTION trg_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS comments_count_trigger ON comments;
CREATE TRIGGER comments_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION trg_comments_count();

-- Reblogs -> posts.reblog_count on the ORIGINAL post.
-- A reblog is a posts row with reblogged_from_id set; counted only when
-- status = 'published' (matches the prior count query).
CREATE OR REPLACE FUNCTION trg_reblog_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  old_counts boolean;
  new_counts boolean;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.reblogged_from_id IS NOT NULL AND NEW.status = 'published' THEN
      UPDATE posts SET reblog_count = reblog_count + 1 WHERE id = NEW.reblogged_from_id;
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    IF OLD.reblogged_from_id IS NOT NULL AND OLD.status = 'published' THEN
      UPDATE posts SET reblog_count = reblog_count - 1 WHERE id = OLD.reblogged_from_id;
    END IF;
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    old_counts := (OLD.reblogged_from_id IS NOT NULL AND OLD.status = 'published');
    new_counts := (NEW.reblogged_from_id IS NOT NULL AND NEW.status = 'published');

    -- If the original target changed while still counting, move the count.
    IF old_counts AND new_counts AND OLD.reblogged_from_id IS DISTINCT FROM NEW.reblogged_from_id THEN
      UPDATE posts SET reblog_count = reblog_count - 1 WHERE id = OLD.reblogged_from_id;
      UPDATE posts SET reblog_count = reblog_count + 1 WHERE id = NEW.reblogged_from_id;
    ELSIF old_counts AND NOT new_counts THEN
      UPDATE posts SET reblog_count = reblog_count - 1 WHERE id = OLD.reblogged_from_id;
    ELSIF NOT old_counts AND new_counts THEN
      UPDATE posts SET reblog_count = reblog_count + 1 WHERE id = NEW.reblogged_from_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reblog_count_trigger ON posts;
CREATE TRIGGER reblog_count_trigger
AFTER INSERT OR DELETE OR UPDATE OF status, reblogged_from_id ON posts
FOR EACH ROW EXECUTE FUNCTION trg_reblog_count();

-- Follows -> profiles.follower_count on the followed user.
CREATE OR REPLACE FUNCTION trg_follows_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE profiles SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE profiles SET follower_count = follower_count - 1 WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS follows_count_trigger ON follows;
CREATE TRIGGER follows_count_trigger
AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION trg_follows_count();

-- ============================================================================
-- 3. BACKFILL EXISTING DATA
-- ============================================================================

UPDATE posts p SET like_count = (
  SELECT count(*) FROM likes l WHERE l.post_id = p.id
);

UPDATE posts p SET comment_count = (
  SELECT count(*) FROM comments c WHERE c.post_id = p.id
);

UPDATE posts p SET reblog_count = (
  SELECT count(*) FROM posts r
  WHERE r.reblogged_from_id = p.id AND r.status = 'published'
);

UPDATE profiles pr SET follower_count = (
  SELECT count(*) FROM follows f WHERE f.following_id = pr.id
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_reblogged_from
  ON posts(reblogged_from_id) WHERE reblogged_from_id IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_tags_name_trgm
  ON tags USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_status_created
  ON posts(status, created_at DESC);
