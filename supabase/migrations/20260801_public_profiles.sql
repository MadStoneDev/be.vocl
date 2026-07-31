-- Profiles are public by default (viewable by logged-out visitors + indexable).
-- Users can opt their profile private, in which case it's members-only and the
-- public /u/[username] page renders a gated shell instead of the content.
alter table profiles
  add column if not exists is_profile_public boolean not null default true;
