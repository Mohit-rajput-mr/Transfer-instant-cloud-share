-- 003: permanent history for HQ.
-- Run once in Supabase → SQL Editor (safe to run again).
--
--  * geo_events (every visit / upload / download with place) are kept for 1 year instead of 30 days.
--  * Two compact tables keep totals forever, filled by a trigger on every new event:
--      country_daily: per day + country: visits, uploads, downloads, bytes up / down
--      route_stats:   every sender place → receiver place pair, all-time count and bytes
--    so all-time numbers and routes stay complete even after old raw events are cleared.
--  * orbit_admin_history(from, to): everything HQ's History tab shows, for any date range.

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

-- raw events now live a year (totals above live forever)
create or replace function public.orbit_reap(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform private.check(p_secret);
  with d as (delete from public.transfers where expires_at <= now() returning coalesce(blob_url, blob_pathname) as u)
  select coalesce(jsonb_agg(u), '[]'::jsonb) into res from d;
  delete from public.geo_events where at < now() - interval '365 days';
  delete from private.login_attempts where at < now() - interval '1 day';
  update public.sessions set viewing = null where viewing is not null and last_seen < now() - interval '2 minutes';
  return res;
end $$;

-- Everything the History tab shows for [p_from, p_to). p_from null = all time.
create or replace function public.orbit_admin_history(p_secret text, p_from timestamptz, p_to timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  f timestamptz := coalesce(p_from, '2000-01-01'::timestamptz);
  t timestamptz := coalesce(p_to, now() + interval '1 day');
  res jsonb;
begin
  perform private.check(p_secret);
  select jsonb_build_object(
    'from', p_from, 'to', p_to,
    'totals', (select jsonb_build_object(
        'visits', coalesce(sum(visits), 0), 'uploads', coalesce(sum(uploads), 0), 'downloads', coalesce(sum(downloads), 0),
        'bytes_up', coalesce(sum(bytes_up), 0), 'bytes_down', coalesce(sum(bytes_down), 0), 'countries', count(distinct country))
      from public.country_daily where day >= f::date and day < t::date + 1),
    'days', coalesce((select jsonb_agg(x order by x.day) from (
        select day, sum(visits) visits, sum(uploads) uploads, sum(downloads) downloads, sum(bytes_up) bytes_up, sum(bytes_down) bytes_down
          from public.country_daily where day >= f::date and day < t::date + 1 group by day) x), '[]'::jsonb),
    'countries', coalesce((select jsonb_agg(x order by x.uploads + x.downloads + x.visits desc) from (
        select country, sum(visits) visits, sum(uploads) uploads, sum(downloads) downloads, sum(bytes_up) bytes_up, sum(bytes_down) bytes_down,
               count(*) active_days
          from public.country_daily where day >= f::date and day < t::date + 1 group by country) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(x) from (
        select country, city, count(*) filter (where kind = 'visit') visits, count(*) filter (where kind = 'upload') uploads,
               count(*) filter (where kind = 'download') downloads, coalesce(sum(bytes), 0) bytes
          from public.geo_events where at >= f and at < t and city is not null
         group by country, city order by count(*) desc limit 300) x), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(x) from (
        select coalesce(label, 'Unknown') label, count(*) filter (where kind = 'upload') uploads, count(*) filter (where kind = 'download') downloads
          from public.geo_events where at >= f and at < t and kind in ('upload', 'download')
         group by 1 order by count(*) desc limit 40) x), '[]'::jsonb),
    -- routes: all time from the permanent table, a range from the raw events
    'routes', case when p_from is null then
        coalesce((select jsonb_agg(x) from (
          select from_cc, from_city, to_cc, to_city, from_lat, from_lon, to_lat, to_lon, n, bytes, first_at, last_at
            from public.route_stats order by n desc limit 1000) x), '[]'::jsonb)
      else
        coalesce((select jsonb_agg(x) from (
          select coalesce(u.country, '??') from_cc, coalesce(u.city, '') from_city, coalesce(d.country, '??') to_cc, coalesce(d.city, '') to_city,
                 min(coalesce(u.lat, d.from_lat)) from_lat, min(coalesce(u.lon, d.from_lon)) from_lon, min(d.lat) to_lat, min(d.lon) to_lon,
                 count(*) n, coalesce(sum(d.bytes), 0) bytes, min(d.at) first_at, max(d.at) last_at
            from public.geo_events d
            left join lateral (select * from private.upload_of(d.transfer_id)) u on true
           where d.kind = 'download' and d.at >= f and d.at < t
           group by 1, 2, 3, 4 order by count(*) desc limit 1000) x), '[]'::jsonb)
      end,
    -- the latest raw events in the range (newest first), for the list
    'events', coalesce((select jsonb_agg(x) from (
        select kind, label, country, city, bytes, at from public.geo_events
         where at >= f and at < t order by at desc limit 2000) x), '[]'::jsonb)
  ) into res;
  return res;
end $$;

revoke all on function private.history_add(), private.upload_of(text) from public, anon, authenticated;
revoke execute on function public.orbit_admin_history(text, timestamptz, timestamptz) from public, authenticated;
grant execute on function public.orbit_admin_history(text, timestamptz, timestamptz) to anon;
