-- 014: areas. Everything in the public void belongs to the rough area of whoever made it (a geohash-4 cell,
-- about 39 x 20 km); people see their own area and the eight around it. Lists stay small however many people use
-- Orbit, and live updates only reach people nearby. Inside a space areas don't matter (members see everything).
alter table public.transfers add column if not exists area text;
alter table public.bubbles add column if not exists area text;
alter table public.tasks add column if not exists area text;
create index if not exists transfers_area_live on public.transfers (area, expires_at);
create index if not exists bubbles_area_live on public.bubbles (area, expires_at);
create index if not exists tasks_area_live on public.tasks (area, expires_at);

create or replace function public.orbit_create(p_secret text, p jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if (select count(*) from public.transfers where net_hash = p->>'netHash' and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.transfers (id, name, file_name, mime, size, blob_pathname, salt, iterations, nonce, chunk_size,
    auth_hash, owner_hash, net_hash, sender_device, max_downloads, hue, country, city, lat, lon, area)
  values (p->>'id', p->>'name', p->>'fileName', coalesce(p->>'mime','application/octet-stream'), (p->>'size')::bigint,
    p->>'pathname', p->>'salt', (p->>'iterations')::int, p->>'nonce', (p->>'chunkSize')::int,
    p->>'authHash', p->>'ownerHash', p->>'netHash', p->>'device', nullif(p->>'maxDownloads','')::int, coalesce((p->>'hue')::int,0),
    nullif(p->>'country',''), nullif(p->>'city',''), nullif(p->>'lat','')::real, nullif(p->>'lon','')::real, nullif(p->>'area',''));
end $$;

create or replace function public.orbit_bubble_add(p_secret text, p jsonb)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if (select count(*) from public.bubbles where net_hash = p->>'net' and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.bubbles (id, body, by, from_key, owner_hash, net_hash, space, hue, expires_at, area)
  values (p->>'id', p->>'body', nullif(p->>'by',''), nullif(p->>'from',''), p->>'owner', p->>'net', nullif(p->>'space',''),
    coalesce((p->>'hue')::int, 0), now() + make_interval(mins => (p->>'life')::int), nullif(p->>'area',''));
end $$;

-- public tasks are numbered per area (Task 1, Task 2… where you are), space tasks per space
create or replace function public.orbit_task_add(p_secret text, p jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  if (select count(*) from public.tasks where net_hash = p->>'net' and created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  select coalesce(max(num), 0) + 1 into n from public.tasks
   where coalesce(space, '') = coalesce(nullif(p->>'space', ''), '') and expires_at > now()
     and (nullif(p->>'space', '') is not null or coalesce(area, '') = coalesce(p->>'area', ''));
  insert into public.tasks (id, num, body, by, from_key, owner_hash, net_hash, space, expires_at, assignee, area)
  values (p->>'id', n, p->>'body', nullif(p->>'by', ''), nullif(p->>'from', ''), p->>'owner', p->>'net', nullif(p->>'space', ''),
    now() + make_interval(mins => (p->>'life')::int), nullif(p->>'assignee', ''), nullif(p->>'area', ''));
  return n;
end $$;

create or replace function public.orbit_task_reorder(p_secret text, p_id text, p_owner_hash text, p_dir integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare t public.tasks; o public.tasks;
begin
  perform private.check(p_secret);
  select * into t from public.tasks where id = p_id and owner_hash = p_owner_hash and expires_at > now() for update;
  if t.id is null then return false; end if;
  if p_dir < 0 then
    select * into o from public.tasks where coalesce(space, '') = coalesce(t.space, '') and expires_at > now() and num < t.num
      and (t.space is not null or coalesce(area, '') = coalesce(t.area, '')) order by num desc limit 1 for update;
  else
    select * into o from public.tasks where coalesce(space, '') = coalesce(t.space, '') and expires_at > now() and num > t.num
      and (t.space is not null or coalesce(area, '') = coalesce(t.area, '')) order by num limit 1 for update;
  end if;
  if o.id is null then return false; end if;
  update public.tasks set num = -1 where id = t.id;
  update public.tasks set num = t.num where id = o.id;
  update public.tasks set num = o.num where id = t.id;
  return true;
end $$;

-- the lists for some areas (null: every area). Rows from before areas existed show everywhere until they burn.
create or replace function public.orbit_list3(p_secret text, p_areas text[])
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare items jsonb; online int;
begin
  perform private.check(p_secret);
  with w as (
    select viewing, count(*) as n from public.sessions
    where viewing is not null and last_seen > now() - interval '50 seconds' group by viewing
  ), t as (
    select * from public.transfers where status in ('ready','sealed') and expires_at > now()
      and (p_areas is null or area is null or area = any(p_areas))
    order by created_at desc limit 160
  )
  select coalesce(jsonb_agg(private.pub(t) || jsonb_build_object('watchers', coalesce(w.n, 0)) order by t.created_at desc), '[]'::jsonb)
    into items from t left join w on w.viewing = t.id;
  select count(*) into online from public.sessions where last_seen > now() - interval '50 seconds';
  return jsonb_build_object('items', items, 'online', online);
end $$;

create or replace function public.orbit_bubble_list2(p_secret text, p_space text, p_areas text[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'text', body, 'by', by, 'from', from_key, 'hue', hue,
      'createdAt', created_at, 'expiresAt', expires_at, 'added', added_at, 'editedAt', edited_at, 'updatedAt', updated_at) order by created_at desc)
    from (select * from public.bubbles where expires_at > now() and coalesce(space, '') = coalesce(p_space, '')
            and (p_space is not null or p_areas is null or area is null or area = any(p_areas))
          order by created_at desc limit 500) x), '[]'::jsonb);
end $$;

create or replace function public.orbit_task_list2(p_secret text, p_space text, p_areas text[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'num', num, 'text', body, 'by', by, 'from', from_key,
      'createdAt', created_at, 'expiresAt', expires_at, 'doneAt', done_at, 'doneBy', done_by, 'assignee', assignee,
      'route', route, 'stage', stage, 'log', stage_log, 'editedAt', edited_at) order by num)
    from (select * from public.tasks where expires_at > now() and coalesce(space, '') = coalesce(p_space, '')
            and (p_space is not null or p_areas is null or area is null or area = any(p_areas))
          order by num limit 200) x), '[]'::jsonb);
end $$;

revoke all on function public.orbit_list3(text, text[]) from public;
revoke all on function public.orbit_bubble_list2(text, text, text[]) from public;
revoke all on function public.orbit_task_list2(text, text, text[]) from public;
grant execute on function public.orbit_list3(text, text[]) to anon;
grant execute on function public.orbit_bubble_list2(text, text, text[]) to anon;
grant execute on function public.orbit_task_list2(text, text, text[]) to anon;
