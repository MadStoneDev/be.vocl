-- Track which posts were published by the queue cron so pacing math is correct
-- regardless of post type (original vs. reblog) or other publishes the user makes.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS published_from_queue BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_posts_published_from_queue
  ON posts(author_id, published_at DESC)
  WHERE published_from_queue = true;
