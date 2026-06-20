-- Public web visibility / privacy model
-- Adds per-profile discoverability + search-indexing controls, and a
-- per-post opt-out from the public front page.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS allow_search_indexing boolean NOT NULL DEFAULT true;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS exclude_from_public boolean NOT NULL DEFAULT false;
