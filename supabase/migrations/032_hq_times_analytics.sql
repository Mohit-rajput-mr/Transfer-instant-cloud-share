-- 032 (2026-10-27, owner): HQ
--  1. Routes follow the "From" time exactly. Until now the globe's routes with a time set came from route_daily, which
--     is per DAY, so "1 h" still showed the whole day. orbit_admin_pins builds each route from its two events instead
--     (the upload of a file + one download of it), with their exact times.
--  2. Times on every pin and route: when it was uploaded, how long the upload took, when it was downloaded and how long
--     that took; uploads/downloads pins and visitor pins carry their first and last time.
--  3. Analytics page: per day visitors, new devices, uploaders, downloaders, uploads, downloads, data, GPS, peak live.
--     Distinct people per day (visitors, uploaders, downloaders, GPS) are counted from this migration on
--     (private.device_days); totals per day (visits, uploads, downloads, data, new devices) go back to the start.

-- how long it took (upload: launch → visible; download: tap → file complete on the receiver)
alter table public.geo_events add column if not exists ms integer;
create index if not exists geo_events_transfer_idx on public.geo_events (transfer_id) where transfer_id is not null;
create index if not exists geo_events_at_idx on public.geo_events (at);

-- one row per device per UTC day it was seen (pulse), and what it did that day
create table if not exists private.device_days (
  day date not null,
  device_id text not null,
  country text,
  gps boolean not null default false,
  uploads integer not null default 0,
  downloads integer not null default 0,
  first_at timestamptz not null default now(),
  primary key (day, device_id)
);
-- people online, every 2 minutes (pg_cron below): the day's peak
create table if not exists private.live_samples (
  at timestamptz primary key default now(),
  online integer not null,
  anon integer not null default 0
);

-- every pulse upserts the session; a device's first pulse of the day adds its day row (later pulses write nothing,
-- except once when it starts sharing GPS). Never in the pulse's way: any error is swallowed.
create or replace function private.mark_device_day() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.device_days (day, device_id, country, gps)
  values ((now() at time zone 'utc')::date, new.device_id, new.country,
          coalesce(new.precise, false) and new.loc_at > now() - interval '10 minutes')
  on conflict (day, device_id) do update set gps = true
   where excluded.gps and not private.device_days.gps;
  return new;
exception when others then
  return new;
end $$;

drop trigger if exists sessions_device_day on public.sessions;
create trigger sessions_device_day after insert or update of last_seen on public.sessions
  for each row execute function private.mark_device_day();

create or replace function private.device_day_bump(p_device text, p_up integer, p_down integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(p_device, '') = '' then return; end if;
  insert into private.device_days (day, device_id, uploads, downloads)
  values ((now() at time zone 'utc')::date, p_device, p_up, p_down)
  on conflict (day, device_id) do update
    set uploads = private.device_days.uploads + p_up, downloads = private.device_days.downloads + p_down;
exception when others then
  null;
end $$;

-- the upload counted at finalize now also says how long it took (launch → visible)
create or replace function public.orbit_finalize(p_secret text, p_id text, p_owner_hash text, p_url text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  update public.transfers set blob_url = p_url, status = 'ready', expires_at = now() + interval '30 minutes'
   where id = p_id and owner_hash = p_owner_hash and status = 'uploading' returning * into t;
  if t.id is null then return null; end if;
  perform private.bump('uploads', 1);
  perform private.bump('bytes_up', t.size);
  insert into public.geo_events (kind, transfer_id, bytes, label, country, city, lat, lon, ms)
  values ('upload', t.id, t.size, t.sender_device, t.country, t.city, t.lat, t.lon,
          least(2147483647, (extract(epoch from now() - t.created_at) * 1000)::bigint)::integer);
  return private.pub(t);
end $$;

-- who uploaded today (the site calls it after a finalize, with the sender's device id)
create or replace function public.orbit_mark_upload(p_secret text, p_device text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  perform private.device_day_bump(p_device, 1, 0);
end $$;

-- received, with how long the download took (p_ms, from the receiver's page)
create or replace function public.orbit_received(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb, p_ms integer)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id for update;
  if t.id is null or t.auth_hash <> p_auth_hash then return jsonb_build_object('ok', false); end if;
  -- limited objects were counted at unlock already
  if t.max_downloads is not null then return jsonb_build_object('ok', true, 'counted', false); end if;
  update public.transfers set downloads = downloads + 1 where id = p_id returning * into t;
  insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'download', p_device, p_label);
  perform private.bump('downloads', 1);
  perform private.bump('bytes_down', t.size);
  insert into public.geo_events (kind, transfer_id, bytes, label, country, city, lat, lon, from_lat, from_lon, ms)
  values ('download', t.id, t.size, p_label, nullif(p_geo->>'country',''), nullif(p_geo->>'city',''),
          nullif(p_geo->>'lat','')::real, nullif(p_geo->>'lon','')::real, t.lat, t.lon,
          case when p_ms between 0 and 86400000 then p_ms end);
  perform private.device_day_bump(p_device, 0, 1);
  return jsonb_build_object('ok', true, 'counted', true, 'downloads', t.downloads);
end $$;

-- (pages from before this migration still call the 6-argument one)
create or replace function public.orbit_received(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb)
returns jsonb language sql security definer set search_path to '' as $$
  select public.orbit_received(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo, null::integer);
$$;

-- HQ globe: pins with their times and every route with its own times, from p_since (null: points 30 days, visitors
-- all time, routes 24 hours)
create or replace function public.orbit_admin_pins(p_secret text, p_since timestamptz) returns jsonb
language plpgsql security definer set search_path = '' stable as $$
declare r jsonb; s timestamptz := least(p_since, now());
begin
  perform private.check(p_secret);
  select jsonb_build_object(
    'points', coalesce((select jsonb_agg(jsonb_build_object('k', kind, 'lat', la, 'lon', lo, 'n', n, 'city', ci, 'cc', co,
        'bytes', b, 'first', f, 'last', l)) from (
        select kind, round(lat::numeric, 2) la, round(lon::numeric, 2) lo, count(*) n, max(city) ci, max(country) co,
               coalesce(sum(bytes), 0) b, min(at) f, max(at) l
          from public.geo_events
         where kind in ('upload', 'download') and lat is not null and at >= coalesce(s, now() - interval '30 days')
         group by 1, 2, 3 order by n desc limit 3000) x), '[]'::jsonb),
    'visitors', coalesce((select jsonb_agg(jsonb_build_object('lat', la, 'lon', lo, 'n', n, 'city', ci, 'cc', co,
        'first', f, 'last', l)) from (
        select round(lat::numeric, 2) la, round(lon::numeric, 2) lo, count(*) n, max(city) ci, max(country) co,
               min(first_seen) f, max(last_seen) l
          from public.sessions
         where lat is not null and (s is null or last_seen >= s)
         group by 1, 2 order by n desc limit 3000) x), '[]'::jsonb),
    'routes', coalesce((select jsonb_agg(x order by x.down_at desc) from (
        select d.transfer_id id, d.bytes, d.at down_at, d.ms down_ms, d.label to_label, d.country to_cc, d.city to_city,
               d.lat to_lat, d.lon to_lon, d.from_lat, d.from_lon,
               u.at up_at, u.ms up_ms, u.label from_label, u.country from_cc, u.city from_city
          from public.geo_events d
          left join lateral (select at, ms, label, country, city from public.geo_events u
                              where u.kind = 'upload' and u.transfer_id = d.transfer_id order by u.at limit 1) u on true
         where d.kind = 'download' and d.from_lat is not null and d.lat is not null
           and d.at >= coalesce(s, now() - interval '24 hours')
         order by d.at desc limit 1500) x), '[]'::jsonb),
    -- when each object still in orbit went up and how long that took (HQ's object list)
    'uploads', coalesce((select jsonb_agg(jsonb_build_object('id', e.transfer_id, 'at', e.at, 'ms', e.ms)) from public.geo_events e
         where e.kind = 'upload' and e.transfer_id in (select id from public.transfers where expires_at > now())), '[]'::jsonb)
  ) into r;
  return r;
end $$;

-- HQ Analytics: one row per UTC day from p_from to p_to (country: only that country)
create or replace function public.orbit_admin_analytics(p_secret text, p_from date, p_to date, p_country text) returns jsonb
language plpgsql security definer set search_path = '' stable as $$
declare
  f date := coalesce(p_from, (select min(at)::date from public.geo_events), current_date);
  t date := coalesce(p_to, (now() at time zone 'utc')::date);
  cc text := nullif(upper(coalesce(p_country, '')), '');
  r jsonb;
begin
  perform private.check(p_secret);
  if t - f > 800 then f := t - 800; end if;
  with days as (select generate_series(f, t, interval '1 day')::date d),
  ev as (
    select (at at time zone 'utc')::date d,
           count(*) filter (where kind = 'visit') visits,
           count(*) filter (where kind = 'upload') uploads,
           count(*) filter (where kind = 'download') downloads,
           coalesce(sum(bytes) filter (where kind = 'upload'), 0) bytes_up,
           coalesce(sum(bytes) filter (where kind = 'download'), 0) bytes_down,
           count(distinct country) countries,
           percentile_disc(0.5) within group (order by ms) filter (where kind = 'upload' and ms is not null) up_ms,
           percentile_disc(0.5) within group (order by ms) filter (where kind = 'download' and ms is not null) down_ms
      from public.geo_events
     where at >= f::timestamptz and at < (t + 1)::timestamptz and (cc is null or country = cc)
     group by 1),
  nd as (
    select (first_seen at time zone 'utc')::date d, count(*) n from public.sessions
     where first_seen >= f::timestamptz and first_seen < (t + 1)::timestamptz and (cc is null or country = cc) group by 1),
  dd as (
    select day d, count(*) visitors, count(*) filter (where gps) gps,
           count(*) filter (where uploads > 0) uploaders, count(*) filter (where downloads > 0) downloaders
      from private.device_days where day between f and t and (cc is null or country = cc) group by 1),
  lv as (
    select (at at time zone 'utc')::date d, max(online) peak, max(anon) anon_peak from private.live_samples
     where at >= f::timestamptz and at < (t + 1)::timestamptz group by 1)
  select jsonb_build_object(
    'from', f, 'to', t, 'country', cc,
    'trackedFrom', (select min(day) from private.device_days),
    'liveFrom', (select min(at) from private.live_samples),
    'countries', coalesce((select jsonb_agg(x order by x.n desc) from (
        select country cc, count(*) n from public.geo_events
         where country is not null and at >= f::timestamptz and at < (t + 1)::timestamptz group by country) x), '[]'::jsonb),
    'days', coalesce((select jsonb_agg(jsonb_build_object(
        'day', days.d, 'visits', coalesce(ev.visits, 0), 'uploads', coalesce(ev.uploads, 0), 'downloads', coalesce(ev.downloads, 0),
        'bytesUp', coalesce(ev.bytes_up, 0), 'bytesDown', coalesce(ev.bytes_down, 0), 'countries', coalesce(ev.countries, 0),
        'newDevices', coalesce(nd.n, 0), 'visitors', dd.visitors, 'gps', dd.gps, 'uploaders', dd.uploaders,
        'downloaders', dd.downloaders, 'livePeak', case when cc is null then lv.peak end, 'upMs', ev.up_ms, 'downMs', ev.down_ms)
        order by days.d)
      from days left join ev on ev.d = days.d left join nd on nd.d = days.d left join dd on dd.d = days.d
      left join lv on lv.d = days.d), '[]'::jsonb)
  ) into r;
  return r;
end $$;

revoke all on function public.orbit_mark_upload(text, text) from public, authenticated;
grant execute on function public.orbit_mark_upload(text, text) to anon;
revoke all on function public.orbit_received(text, text, text, text, text, jsonb, integer) from public, authenticated;
grant execute on function public.orbit_received(text, text, text, text, text, jsonb, integer) to anon;
revoke all on function public.orbit_received(text, text, text, text, text, jsonb) from public, authenticated;
grant execute on function public.orbit_received(text, text, text, text, text, jsonb) to anon;
revoke all on function public.orbit_admin_pins(text, timestamptz) from public, authenticated;
grant execute on function public.orbit_admin_pins(text, timestamptz) to anon;
revoke all on function public.orbit_admin_analytics(text, date, date, text) from public, authenticated;
grant execute on function public.orbit_admin_analytics(text, date, date, text) to anon;
revoke all on function private.device_day_bump(text, integer, integer) from public, anon, authenticated;
revoke all on function private.mark_device_day() from public, anon, authenticated;

-- people online, sampled every 2 minutes (~720 small rows a day)
create or replace function private.sample_live() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into private.live_samples (at, online, anon) values (
    date_trunc('minute', now()),
    (select count(*) from public.sessions where last_seen > now() - interval '120 seconds'),
    (select count(*) from private.anon_online where last_seen > now() - interval '120 seconds'))
  on conflict (at) do nothing;
end $$;
select cron.schedule('orbit-live-sample', '*/2 * * * *', 'select private.sample_live()');
