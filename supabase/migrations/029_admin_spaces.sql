-- 029: the admin's Spaces page (/admin/spaces). Three things it needs that weren't kept:
--  1. who is live in a space right now: every member's browser re-enters its space every ~15 s (the member list);
--     that call now stamps space_members.seen_at, so "live" = seen in the last 90 seconds.
--  2. how much has flowed through a space: files and notes are deleted when they burn, so running totals per space
--     are counted as things happen (private.space_stats, by triggers that can never fail the write they ride on).
--  3. one call with every space's numbers, the anonymous sessions and 30 days of history.

alter table public.space_members add column if not exists seen_at timestamptz;

create or replace function public.orbit_space_seen(p_secret text, p_slug text, p_dh text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  update public.space_members set seen_at = now() where slug = p_slug and dh = p_dh and not gone;
end $$;

create table if not exists private.space_stats (
  slug text primary key,
  files int not null default 0,
  bytes_up bigint not null default 0,
  downloads int not null default 0,
  bytes_down bigint not null default 0,
  notes int not null default 0,
  tasks int not null default 0,
  updated_at timestamptz not null default now()
);
alter table private.space_stats enable row level security;

create or replace function private.space_stats_add(p_slug text, p_files int, p_up bigint, p_dl int, p_down bigint, p_notes int, p_tasks int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_slug is null or p_slug = '' then return; end if;
  insert into private.space_stats as s (slug, files, bytes_up, downloads, bytes_down, notes, tasks)
  values (left(p_slug, 64), p_files, p_up, p_dl, p_down, p_notes, p_tasks)
  on conflict (slug) do update set files = s.files + excluded.files, bytes_up = s.bytes_up + excluded.bytes_up,
    downloads = s.downloads + excluded.downloads, bytes_down = s.bytes_down + excluded.bytes_down,
    notes = s.notes + excluded.notes, tasks = s.tasks + excluded.tasks, updated_at = now();
end $$;

-- a file in a space: counted once when it is up (ready or sealed), and every download with its size
create or replace function private.space_stats_transfer() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.space_slug is not null then
      if new.status in ('ready', 'sealed') and (tg_op = 'INSERT' or old.status not in ('ready', 'sealed')) then
        perform private.space_stats_add(new.space_slug, 1, coalesce(new.size, 0), 0, 0, 0, 0);
      end if;
      if tg_op = 'UPDATE' and new.downloads > old.downloads then
        perform private.space_stats_add(new.space_slug, 0, 0, new.downloads - old.downloads, (new.downloads - old.downloads) * coalesce(new.size, 0), 0, 0);
      end if;
    end if;
  exception when others then null; -- statistics never fail an upload or a download
  end;
  return new;
end $$;
drop trigger if exists space_stats_transfer on public.transfers;
create trigger space_stats_transfer after insert or update of status, downloads on public.transfers
  for each row execute function private.space_stats_transfer();

create or replace function private.space_stats_item() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    if new.space is not null then
      if tg_table_name = 'bubbles' then perform private.space_stats_add(new.space, 0, 0, 0, 0, 1, 0);
      else perform private.space_stats_add(new.space, 0, 0, 0, 0, 0, 1); end if;
    end if;
  exception when others then null;
  end;
  return new;
end $$;
drop trigger if exists space_stats_bubble on public.bubbles;
create trigger space_stats_bubble after insert on public.bubbles for each row execute function private.space_stats_item();
drop trigger if exists space_stats_task on public.tasks;
create trigger space_stats_task after insert on public.tasks for each row execute function private.space_stats_item();

-- everything the Spaces page shows, in one call. Titles are sealed in spaces.meta: the API adds them (lib/spaces.ts).
create or replace function public.orbit_admin_spaces(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' stable as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'now', now(),
    'spaces', coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
      select jsonb_build_object(
        'slug', s.slug, 'anon', s.anon, 'created_at', s.created_at, 'burnt_at', s.burnt_at,
        'members', (select count(*) from public.space_members m where m.slug = s.slug and not m.gone),
        'joined', (select count(*) from public.space_members m where m.slug = s.slug),
        'live', (select count(*) from public.space_members m where m.slug = s.slug and not m.gone and m.seen_at > now() - interval '90 seconds'),
        'last_seen', (select max(m.seen_at) from public.space_members m where m.slug = s.slug),
        'files_now', (select count(*) from public.transfers t where t.space_slug = s.slug and t.status in ('ready', 'sealed') and t.expires_at > now()),
        'bytes_now', (select coalesce(sum(t.size), 0) from public.transfers t where t.space_slug = s.slug and t.status in ('ready', 'sealed') and t.expires_at > now()),
        'notes_now', (select count(*) from public.bubbles b where b.space = s.slug and b.expires_at > now()),
        'tasks_now', (select count(*) from public.tasks k where k.space = s.slug and k.expires_at > now()),
        'files', coalesce(st.files, 0), 'bytes_up', coalesce(st.bytes_up, 0), 'downloads', coalesce(st.downloads, 0),
        'bytes_down', coalesce(st.bytes_down, 0), 'notes', coalesce(st.notes, 0), 'tasks', coalesce(st.tasks, 0)
      ) x
      from public.spaces s left join private.space_stats st on st.slug = s.slug
      where s.created_at > now() - interval '30 days'
      order by s.created_at desc limit 300
    ) q), '[]'::jsonb),
    'sessions', jsonb_build_object(
      'total', (select count(*) from private.anon_sessions),
      'live', (select count(*) from private.anon_sessions a where a.ended_at is null and a.ends_at > now()),
      'today', (select count(*) from private.anon_sessions a where a.started_at > date_trunc('day', now())),
      'list', coalesce((select jsonb_agg(y order by y->>'started_at' desc) from (
        select jsonb_build_object('alias', a.alias, 'min', a.min, 'started_at', a.started_at, 'ends_at', a.ends_at,
          'ended_at', a.ended_at, 'end_reason', a.end_reason, 'country', a.country, 'city', a.city, 'spaces', to_jsonb(a.spaces)) y
        from private.anon_sessions a order by a.started_at desc limit 200) r), '[]'::jsonb)
    ),
    'days', coalesce((select jsonb_agg(d order by d->>'day') from (
      select jsonb_build_object('day', g.day::date,
        'spaces', (select count(*) from public.spaces s where not s.anon and s.created_at >= g.day and s.created_at < g.day + interval '1 day'),
        'anon_spaces', (select count(*) from public.spaces s where s.anon and s.created_at >= g.day and s.created_at < g.day + interval '1 day'),
        'sessions', (select count(*) from private.anon_sessions a where a.started_at >= g.day and a.started_at < g.day + interval '1 day')) d
      from generate_series(date_trunc('day', now()) - interval '29 days', date_trunc('day', now()), interval '1 day') g(day)
    ) h), '[]'::jsonb)
  );
end $$;

revoke all on function public.orbit_space_seen(text, text, text), public.orbit_admin_spaces(text) from public, authenticated;
grant execute on function public.orbit_space_seen(text, text, text), public.orbit_admin_spaces(text) to anon;
revoke all on function private.space_stats_add(text, int, bigint, int, bigint, int, int) from public, anon, authenticated;
