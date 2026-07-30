-- tags.post_count should reflect PUBLISHED posts only. Previously the post_tags
-- trigger counted every tag usage regardless of post status, so queued /
-- scheduled / draft / deleted posts inflated tag counts (Explore, tag pages).

-- 1) post_tags insert/delete now only adjust the count when the post is published.
create or replace function update_tag_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from posts where id = new.post_id and status = 'published') then
      update tags set post_count = post_count + 1 where id = new.tag_id;
    end if;
  elsif tg_op = 'DELETE' then
    if exists (select 1 from posts where id = old.post_id and status = 'published') then
      update tags set post_count = greatest(0, post_count - 1) where id = old.tag_id;
    end if;
  end if;
  return null;
end;
$$ language plpgsql;

-- 2) When a post transitions into / out of 'published' (e.g. the queue/schedule
--    cron publishes it, or it's soft-deleted), adjust all its tags' counts.
create or replace function update_tag_count_on_status()
returns trigger as $$
begin
  if new.status = 'published' and old.status is distinct from 'published' then
    update tags set post_count = post_count + 1
      where id in (select tag_id from post_tags where post_id = new.id);
  elsif old.status = 'published' and new.status is distinct from 'published' then
    update tags set post_count = greatest(0, post_count - 1)
      where id in (select tag_id from post_tags where post_id = new.id);
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists posts_status_tag_count on posts;
create trigger posts_status_tag_count
  after update of status on posts
  for each row execute function update_tag_count_on_status();

-- 3) One-time recompute to correct existing inflated counts.
update tags t set post_count = coalesce((
  select count(*) from post_tags pt
  join posts p on p.id = pt.post_id
  where pt.tag_id = t.id and p.status = 'published'
), 0);
