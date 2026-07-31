-- Immutable date of birth. Set once by the user (enforced in the app layer);
-- only staff/service-role change it thereafter. Gates access to sensitive content
-- (must be 21+). Nullable: existing accounts have none until they set it.
alter table profiles add column if not exists date_of_birth date;

-- Enforce the new gate on existing accounts: anyone without a qualifying 21+
-- DOB has sensitive-content viewing turned off until they set one. (Every
-- existing row has date_of_birth NULL right after this migration, so this
-- clears the flag for all current accounts that had it on.)
update profiles
set show_sensitive_posts = false
where show_sensitive_posts = true
  and (date_of_birth is null or date_of_birth > current_date - interval '21 years');
