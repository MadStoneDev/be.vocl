-- Phase 1: Muted post notifications
CREATE TABLE IF NOT EXISTS muted_post_notifications (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

-- Phase 2: Bookmark collections
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add collection_id to bookmarks (skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookmarks' AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE bookmarks ADD COLUMN collection_id UUID REFERENCES bookmark_collections(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookmark_collections_user ON bookmark_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_collection ON bookmarks(collection_id);
