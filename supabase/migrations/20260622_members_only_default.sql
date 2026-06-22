-- Privacy-first default: new posts are Members-only (not shown to logged-out
-- visitors) unless the author explicitly chooses the Public audience.
-- exclude_from_public previously defaulted to false (Public); flip the default.
-- Existing rows are left as-is (changing historical visibility would be surprising);
-- only the going-forward default changes.

ALTER TABLE posts ALTER COLUMN exclude_from_public SET DEFAULT true;
