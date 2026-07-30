-- Who can start a DM conversation with this user.
-- 'everyone' (default) | 'following' (only people the user follows) | 'none'.
alter table profiles
  add column if not exists dm_privacy text not null default 'everyone';

alter table profiles
  drop constraint if exists profiles_dm_privacy_check;

alter table profiles
  add constraint profiles_dm_privacy_check
  check (dm_privacy in ('everyone', 'following', 'none'));
