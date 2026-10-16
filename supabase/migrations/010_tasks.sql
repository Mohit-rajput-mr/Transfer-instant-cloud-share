-- 010: tasks. One line each, numbered in the order they were added (Task 1, Task 2, …) per void or space.
-- Anyone who can see a task can tick it done; files are wired to a task through their name tag (w=<id>).
-- Tasks burn like everything else.
create table if not exists public.tasks (
  id text primary key,
  num int not null,
  body text not null,
  by text,
  from_key text,
  owner_hash text not null,
  net_hash text,
  space text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  done_at timestamptz,
  done_by text
);
create index if not exists tasks_live on public.tasks (expires_at);
alter table public.tasks enable row level security;
revoke all on public.tasks from anon, authenticated;

create or replace function public.orbit_task_add(p_secret text, p jsonb) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  if (select count(*) from public.tasks where net_hash = p->>'net' and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  -- numbering restarts once every task in this place has burnt
  select coalesce(max(num), 0) + 1 into n from public.tasks
   where coalesce(space, '') = coalesce(nullif(p->>'space', ''), '') and expires_at > now();
  insert into public.tasks (id, num, body, by, from_key, owner_hash, net_hash, space, expires_at)
  values (p->>'id', n, p->>'body', nullif(p->>'by', ''), nullif(p->>'from', ''), p->>'owner', p->>'net', nullif(p->>'space', ''),
    now() + make_interval(mins => (p->>'life')::int));
  return n;
end $$;

create or replace function public.orbit_task_list(p_secret text, p_space text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'num', num, 'text', body, 'by', by, 'from', from_key,
      'createdAt', created_at, 'expiresAt', expires_at, 'doneAt', done_at, 'doneBy', done_by) order by num)
    from (select * from public.tasks where expires_at > now() and coalesce(space, '') = coalesce(p_space, '')
          order by num limit 200) x), '[]'::jsonb);
end $$;

-- anyone in the same place ticks it (or unticks it)
create or replace function public.orbit_task_done(p_secret text, p_id text, p_space text, p_done boolean, p_by text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.tasks set done_at = case when p_done then now() end, done_by = case when p_done then nullif(p_by, '') end
   where id = p_id and coalesce(space, '') = coalesce(p_space, '') and expires_at > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.orbit_task_burn(p_secret text, p_id text, p_owner_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.tasks set expires_at = now() where id = p_id and owner_hash = p_owner_hash and expires_at > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.orbit_task_add(text, jsonb), public.orbit_task_list(text, text), public.orbit_task_done(text, text, text, boolean, text), public.orbit_task_burn(text, text, text) from public;
grant execute on function public.orbit_task_add(text, jsonb), public.orbit_task_list(text, text), public.orbit_task_done(text, text, text, boolean, text), public.orbit_task_burn(text, text, text) to anon;

-- 010b (applied as task_assign): who a task is for ("@Sofia" when writing it, or "Take it")
alter table public.tasks add column if not exists assignee text;
create or replace function public.orbit_task_assign(p_secret text, p_id text, p_space text, p_assignee text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.tasks set assignee = nullif(p_assignee, '')
   where id = p_id and coalesce(space, '') = coalesce(p_space, '') and expires_at > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;
-- orbit_task_add also stores p->>'assignee'; orbit_task_list also returns 'assignee'
revoke all on function public.orbit_task_assign(text, text, text, text) from public;
grant execute on function public.orbit_task_assign(text, text, text, text) to anon;
