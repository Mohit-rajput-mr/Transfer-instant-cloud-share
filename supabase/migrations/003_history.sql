-- 003: permanent history for HQ (applied to the live project).
--
-- Raw geo_events still live 30 days (orbit_reap is unchanged). Everything HQ's History shows is kept
-- forever in small per-day tables, filled by triggers on every new event and backfilled once:
--   country_daily  day x country: visits, uploads, downloads, bytes up / down
--   place_daily    day x city:    visits, uploads, downloads, bytes
--   device_daily   day x device:  uploads, downloads
--   route_daily    day x (sender place -> receiver place): transfers, bytes, coordinates
--   route_stats    the same routes all time (first / last seen)
-- orbit_admin_history(from, to) answers the History tab for any date range from these tables
-- (the raw event list covers what geo_events still holds).

create table if not exists public.country_daily (
  day date not null,
  country text not null,
  visits int not null default 0,
  uploads int not null default 0,
  downloads int not null default 0,
  bytes_up bigint not null default 0,
  bytes_down bigint not null default 0,
  primary key (day, country)
);

create table if not exists public.route_stats (
  from_cc text not null, from_city text not null,
  to_cc text not null, to_city text not null,
  from_lat real, from_lon real, to_lat real, to_lon real,
  n int not null default 0,
  bytes bigint not null default 0,
  first_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  primary key (from_cc, from_city, to_cc, to_city)
);

alter table public.country_daily enable row level security;
alter table public.route_stats enable row level security;
revoke all on public.country_daily, public.route_stats from anon, authenticated;

create index if not exists geo_events_tid on public.geo_events(transfer_id) where transfer_id is not null;
create index if not exists geo_events_country_at on public.geo_events(country, at);

-- where an upload came from (for a download's route)
create or replace function private.upload_of(p_tid text)
returns table (country text, city text, lat real, lon real)
language sql stable security definer set search_path = '' as $$
  select g.country, g.city, g.lat, g.lon from public.geo_events g
   where g.transfer_id = p_tid and g.kind = 'upload' order by g.at limit 1
$$;

create or replace function private.history_add() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  insert into public.country_daily as c (day, country, visits, uploads, downloads, bytes_up, bytes_down)
  values ((new.at at time zone 'utc')::date, coalesce(new.country, '??'),
          (new.kind = 'visit')::int, (new.kind = 'upload')::int, (new.kind = 'download')::int,
          case when new.kind = 'upload' then coalesce(new.bytes, 0) else 0 end,
          case when new.kind = 'download' then coalesce(new.bytes, 0) else 0 end)
  on conflict (day, country) do update set
    visits = c.visits + excluded.visits, uploads = c.uploads + excluded.uploads, downloads = c.downloads + excluded.downloads,
    bytes_up = c.bytes_up + excluded.bytes_up, bytes_down = c.bytes_down + excluded.bytes_down;

  if new.kind = 'download' and new.transfer_id is not null then
    select * into s from private.upload_of(new.transfer_id);
    insert into public.route_stats as r (from_cc, from_city, to_cc, to_city, from_lat, from_lon, to_lat, to_lon, n, bytes, first_at, last_at)
    values (coalesce(s.country, '??'), coalesce(s.city, ''), coalesce(new.country, '??'), coalesce(new.city, ''),
            coalesce(s.lat, new.from_lat), coalesce(s.lon, new.from_lon), new.lat, new.lon, 1, coalesce(new.bytes, 0), new.at, new.at)
    on conflict (from_cc, from_city, to_cc, to_city) do update set
      n = r.n + 1, bytes = r.bytes + excluded.bytes, last_at = greatest(r.last_at, excluded.last_at),
      from_lat = coalesce(r.from_lat, excluded.from_lat), from_lon = coalesce(r.from_lon, excluded.from_lon),
      to_lat = coalesce(r.to_lat, excluded.to_lat), to_lon = coalesce(r.to_lon, excluded.to_lon);
  end if;
  return new;
end $$;

drop trigger if exists geo_events_history on public.geo_events;
create trigger geo_events_history after insert on public.geo_events for each row execute function private.history_add();

-- backfill once from the events still kept (only when the tables are empty)
do $$
begin
  if not exists (select 1 from public.country_daily) then
    insert into public.country_daily (day, country, visits, uploads, downloads, bytes_up, bytes_down)
    select (at at time zone 'utc')::date, coalesce(country, '??'),
           count(*) filter (where kind = 'visit'), count(*) filter (where kind = 'upload'), count(*) filter (where kind = 'download'),
           coalesce(sum(bytes) filter (where kind = 'upload'), 0), coalesce(sum(bytes) filter (where kind = 'download'), 0)
      from public.geo_events group by 1, 2;
  end if;
  if not exists (select 1 from public.route_stats) then
    insert into public.route_stats (from_cc, from_city, to_cc, to_city, from_lat, from_lon, to_lat, to_lon, n, bytes, first_at, last_at)
    select coalesce(u.country, '??'), coalesce(u.city, ''), coalesce(d.country, '??'), coalesce(d.city, ''),
           min(coalesce(u.lat, d.from_lat)), min(coalesce(u.lon, d.from_lon)), min(d.lat), min(d.lon),
           count(*), coalesce(sum(d.bytes), 0), min(d.at), max(d.at)
      from public.geo_events d
      left join lateral (select * from private.upload_of(d.transfer_id)) u on true
     where d.kind = 'download'
     group by 1, 2, 3, 4;
  end if;
end $$;

-- per city, per device and per-day routes (kept forever too)
create table if not exists public.place_daily (
  day date not null, country text not null, city text not null,
  visits int not null default 0, uploads int not null default 0, downloads int not null default 0,
  bytes bigint not null default 0,
  primary key (day, country, city)
);
create table if not exists public.device_daily (
  day date not null, label text not null,
  uploads int not null default 0, downloads int not null default 0,
  primary key (day, label)
);
create table if not exists public.route_daily (
  day date not null,
  from_cc text not null, from_city text not null, to_cc text not null, to_city text not null,
  from_lat real, from_lon real, to_lat real, to_lon real,
  n int not null default 0, bytes bigint not null default 0,
  primary key (day, from_cc, from_city, to_cc, to_city)
);
alter table public.place_daily enable row level security;
alter table public.device_daily enable row level security;
alter table public.route_daily enable row level security;
revoke all on public.place_daily, public.device_daily, public.route_daily from anon, authenticated;

create or replace function private.history_add2() returns trigger
language plpgsql security definer set search_path = '' as $$
declare d date := (new.at at time zone 'utc')::date;
begin
  if new.city is not null then
    insert into public.place_daily as p (day, country, city, visits, uploads, downloads, bytes)
    values (d, coalesce(new.country, '??'), new.city, (new.kind = 'visit')::int, (new.kind = 'upload')::int, (new.kind = 'download')::int,
            case when new.kind in ('upload', 'download') then coalesce(new.bytes, 0) else 0 end)
    on conflict (day, country, city) do update set
      visits = p.visits + excluded.visits, uploads = p.uploads + excluded.uploads, downloads = p.downloads + excluded.downloads, bytes = p.bytes + excluded.bytes;
  end if;
  if new.kind in ('upload', 'download') then
    insert into public.device_daily as v (day, label, uploads, downloads)
    values (d, coalesce(nullif(new.label, ''), 'Unknown'), (new.kind = 'upload')::int, (new.kind = 'download')::int)
    on conflict (day, label) do update set uploads = v.uploads + excluded.uploads, downloads = v.downloads + excluded.downloads;
  end if;
  return new;
end $$;
create or replace trigger geo_events_history2 after insert on public.geo_events for each row execute function private.history_add2();

create or replace function private.history_add3() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  if new.kind = 'download' and new.transfer_id is not null then
    select * into s from private.upload_of(new.transfer_id);
    insert into public.route_daily as r (day, from_cc, from_city, to_cc, to_city, from_lat, from_lon, to_lat, to_lon, n, bytes)
    values ((new.at at time zone 'utc')::date, coalesce(s.country, '??'), coalesce(s.city, ''), coalesce(new.country, '??'), coalesce(new.city, ''),
            coalesce(s.lat, new.from_lat), coalesce(s.lon, new.from_lon), new.lat, new.lon, 1, coalesce(new.bytes, 0))
    on conflict (day, from_cc, from_city, to_cc, to_city) do update set
      n = r.n + 1, bytes = r.bytes + excluded.bytes,
      from_lat = coalesce(r.from_lat, excluded.from_lat), from_lon = coalesce(r.from_lon, excluded.from_lon),
      to_lat = coalesce(r.to_lat, excluded.to_lat), to_lon = coalesce(r.to_lon, excluded.to_lon);
  end if;
  return new;
end $$;
create or replace trigger geo_events_history3 after insert on public.geo_events for each row execute function private.history_add3();
revoke all on function private.history_add2(), private.history_add3() from public, anon, authenticated;

-- backfill (only when empty)
insert into public.place_daily (day, country, city, visits, uploads, downloads, bytes)
select (at at time zone 'utc')::date, coalesce(country, '??'), city,
       count(*) filter (where kind = 'visit'), count(*) filter (where kind = 'upload'), count(*) filter (where kind = 'download'),
       coalesce(sum(bytes) filter (where kind in ('upload', 'download')), 0)
  from public.geo_events where city is not null and not exists (select 1 from public.place_daily)
 group by 1, 2, 3;
insert into public.device_daily (day, label, uploads, downloads)
select (at at time zone 'utc')::date, coalesce(nullif(label, ''), 'Unknown'), count(*) filter (where kind = 'upload'), count(*) filter (where kind = 'download')
  from public.geo_events where kind in ('upload', 'download') and not exists (select 1 from public.device_daily)
 group by 1, 2;
insert into public.route_daily (day, from_cc, from_city, to_cc, to_city, from_lat, from_lon, to_lat, to_lon, n, bytes)
select (d.at at time zone 'utc')::date, coalesce(u.country, '??'), coalesce(u.city, ''), coalesce(d.country, '??'), coalesce(d.city, ''),
       min(coalesce(u.lat, d.from_lat)), min(coalesce(u.lon, d.from_lon)), min(d.lat), min(d.lon), count(*), coalesce(sum(d.bytes), 0)
  from public.geo_events d
  left join lateral (select * from private.upload_of(d.transfer_id)) u on true
 where d.kind = 'download' and not exists (select 1 from public.route_daily)
 group by 1, 2, 3, 4, 5;

-- Everything the History tab shows for [p_from, p_to] (dates, inclusive). p_from null = all time.
create or replace function public.orbit_admin_history(p_secret text, p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f date := coalesce(p_from, '2000-01-01'::timestamptz)::date;
  t date := coalesce(p_to, now() + interval '1 day')::date;
  ft timestamptz := coalesce(p_from, '2000-01-01'::timestamptz);
  tt timestamptz := coalesce(p_to, now() + interval '1 day');
  res jsonb;
begin
  perform private.check(p_secret);
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', (select jsonb_build_object(
        'visits', coalesce(sum(visits), 0), 'uploads', coalesce(sum(uploads), 0), 'downloads', coalesce(sum(downloads), 0),
        'bytes_up', coalesce(sum(bytes_up), 0), 'bytes_down', coalesce(sum(bytes_down), 0), 'countries', count(distinct country))
      from public.country_daily where day >= f and day <= t),
    'days', coalesce((select jsonb_agg(x order by x.day) from (
        select day, sum(visits) visits, sum(uploads) uploads, sum(downloads) downloads, sum(bytes_up) bytes_up, sum(bytes_down) bytes_down
          from public.country_daily where day >= f and day <= t group by day) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(x order by x.uploads + x.downloads + x.visits desc) from (
        select country, sum(visits) visits, sum(uploads) uploads, sum(downloads) downloads, sum(bytes_up) bytes_up, sum(bytes_down) bytes_down,
               count(*) active_days
          from public.country_daily where day >= f and day <= t group by country) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(x) from (
        select country, city, sum(visits) visits, sum(uploads) uploads, sum(downloads) downloads, sum(bytes) bytes
          from public.place_daily where day >= f and day <= t
         group by country, city order by sum(visits + uploads + downloads) desc limit 300) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (
        select label, sum(uploads) uploads, sum(downloads) downloads
          from public.device_daily where day >= f and day <= t
         group by label order by sum(uploads + downloads) desc limit 40) x), '[]'::jsonb),
    'routes', coalesce((select jsonb_agg(x) from (
        select from_cc, from_city, to_cc, to_city, min(from_lat) from_lat, min(from_lon) from_lon, min(to_lat) to_lat, min(to_lon) to_lon,
               sum(n) n, sum(bytes) bytes, min(day)::timestamptz first_at, max(day)::timestamptz last_at
          from public.route_daily where day >= f and day <= t
         group by 1, 2, 3, 4 order by sum(n) desc limit 1000) x), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(x) from (
        select kind, label, country, city, bytes, at from public.geo_events
         where at >= ft and at < tt order by at desc limit 2000) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

revoke all on function private.history_add(), private.upload_of(text) from public, anon, authenticated;
revoke execute on function public.orbit_admin_history(text, timestamptz, timestamptz) from public, authenticated;
grant execute on function public.orbit_admin_history(text, timestamptz, timestamptz) to anon;
