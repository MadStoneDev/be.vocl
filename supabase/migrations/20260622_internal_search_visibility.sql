-- Per-profile control over appearing in be.vocl's INTERNAL search (people search).
-- This is distinct from:
--   is_discoverable        -> public front page / public web surfaces
--   allow_search_indexing  -> external search engines (Google etc.)
-- A user can stay on the site and be followable while opting out of being
-- surfaced in the in-app people search.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_searchable boolean NOT NULL DEFAULT true;
