-- Returns one row per conversation for the current user: the latest message
-- and the unread count. Replaces two unbounded "fetch every message and reduce
-- in JS" queries in getConversations. Scoped to auth.uid(), so security definer
-- is safe.
create or replace function get_conversation_previews()
returns table (
  conversation_id uuid,
  last_content text,
  last_sender_id uuid,
  last_created_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with my_convos as (
    select cp.conversation_id, cp.last_read_at
    from conversation_participants cp
    where cp.profile_id = auth.uid()
  ),
  latest as (
    select distinct on (m.conversation_id)
      m.conversation_id, m.content, m.sender_id, m.created_at
    from messages m
    join my_convos c on c.conversation_id = m.conversation_id
    where m.is_deleted = false
    order by m.conversation_id, m.created_at desc
  ),
  unread as (
    select m.conversation_id, count(*)::bigint as cnt
    from messages m
    join my_convos c on c.conversation_id = m.conversation_id
    where m.sender_id <> auth.uid()
      and m.is_deleted = false
      and m.created_at > coalesce(c.last_read_at, '1970-01-01'::timestamptz)
    group by m.conversation_id
  )
  select
    c.conversation_id,
    l.content,
    l.sender_id,
    l.created_at,
    coalesce(u.cnt, 0)
  from my_convos c
  left join latest l on l.conversation_id = c.conversation_id
  left join unread u on u.conversation_id = c.conversation_id;
$$;

grant execute on function get_conversation_previews() to authenticated;
