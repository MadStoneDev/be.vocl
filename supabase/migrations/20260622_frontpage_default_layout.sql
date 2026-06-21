-- Make the broadsheet "Front Page" the default feed layout.
--
-- The feed_layout column previously defaulted to 'reader'. Product direction is
-- for the newspaper/broadsheet layout to be the default experience (users can
-- still switch back to Reader via the layout toggle in the feed tabs).
--
-- NOTE: this backfills every row currently sitting on the old 'reader' default to
-- 'frontpage'. This is acceptable pre-launch where the layout toggle is brand new
-- and no meaningful population has deliberately chosen Reader yet. After launch,
-- prefer a nullable "no explicit choice" sentinel instead of a bulk update.

ALTER TABLE profiles ALTER COLUMN feed_layout SET DEFAULT 'frontpage';

UPDATE profiles SET feed_layout = 'frontpage' WHERE feed_layout = 'reader';
