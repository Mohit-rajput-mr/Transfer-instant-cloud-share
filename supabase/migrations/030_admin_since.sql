-- 030: HQ "From" filter. The same shape as orbit_admin_overview, but every number, list and globe layer only counts
-- what happened at or after p_since (visits, uploads, downloads, views, devices, places, GPS, routes, objects).
-- "online now" and the live dots stay live. Also: how many devices active since then shared GPS and how many didn't.
create or replace function public.orbit_admin_overview_since(p_secret text, p_since timestamptz) returns jsonb
language plpgsql security definer set search_path = '' stable as $$
declare r jsonb; s timestamptz := least(coalesce(p_since, now() - interval '24 hours'), now());
begin
  perform private.check(p_secret);
  select jsonb_build_object(
    'now', now(),
    'since', s,
    'online', (select count(*) from public.sessions where last_seen > now() - interval '120 seconds'),
    'devices', (select count(*) from public.sessions where last_seen >= s),
    'newDevices', (select count(*) from public.sessions where first_seen >= s),
    'visits', (select count(*) from public.geo_events where kind = 'visit' and at >= s),
    'countries', (select count(distinct country) from public.sessions where country is not null and last_seen >= s),
    'gps', jsonb_build_object(
      'on', (select count(*) from public.sessions where last_seen >= s and precise and loc_at >= s),
      'off', (select count(*) from public.sessions where last_seen >= s and not (coalesce(precise, false) and loc_at >= s))),
    'orbit', (select jsonb_build_object(
        'objects', count(*) filter (where status in ('ready','sealed') and expires_at > now()),
        'uploading', count(*) filter (where status = 'uploading' and expires_at > now()),
        'bytes', coalesce(sum(size) filter (where status in ('ready','sealed')), 0),
        'downloads', coalesce(sum(downloads), 0))
      from public.transfers where created_at >= s),
    'today', (select jsonb_build_object(
        'uploads', count(*) filter (where kind = 'upload'), 'downloads', count(*) filter (where kind = 'download'),
        'bytes_up', coalesce(sum(bytes) filter (where kind = 'upload'), 0), 'bytes_down', coalesce(sum(bytes) filter (where kind = 'download'), 0),
        'views', (select count(*) from public.transfer_events e where e.kind = 'view' and e.created_at >= s),
        'reports', (select count(*) from public.transfer_events e where e.kind = 'report' and e.created_at >= s))
      from public.geo_events where at >= s),
    'days', coalesce((select jsonb_agg(d order by d->>'day') from (
        select jsonb_build_object('day', date_trunc('day', at)::date, 'uploads', count(*) filter (where kind = 'upload'),
          'downloads', count(*) filter (where kind = 'download'), 'bytes_up', coalesce(sum(bytes) filter (where kind = 'upload'), 0),
          'bytes_down', coalesce(sum(bytes) filter (where kind = 'download'), 0), 'views', 0, 'reports', 0) d
        from public.geo_events where at >= s group by date_trunc('day', at)) x), '[]'::jsonb),
    'totals', (select jsonb_build_object('uploads', count(*) filter (where kind = 'upload'), 'downloads', count(*) filter (where kind = 'download'),
        'bytes_up', coalesce(sum(bytes) filter (where kind = 'upload'), 0), 'bytes_down', coalesce(sum(bytes) filter (where kind = 'download'), 0),
        'views', (select count(*) from public.transfer_events e where e.kind = 'view' and e.created_at >= s))
      from public.geo_events where at >= s),
    'hourly', coalesce((select jsonb_agg(jsonb_build_object('h', h, 'up', up, 'down', down, 'visit', visit) order by h) from (
        select date_trunc('hour', at) as h, count(*) filter (where kind = 'upload') as up,
          count(*) filter (where kind = 'download') as down, count(*) filter (where kind = 'visit') as visit
        from public.geo_events where at >= greatest(s, now() - interval '7 days') group by 1) x), '[]'::jsonb),
    'topCountries', coalesce((select jsonb_agg(c order by (c->>'devices')::int desc) from (
        select jsonb_build_object('country', country, 'devices', count(*), 'live', count(*) filter (where last_seen > now() - interval '120 seconds')) as c
        from public.sessions where country is not null and last_seen >= s group by country order by count(*) desc limit 30) x), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(c) from (
        select jsonb_build_object('city', city, 'country', country, 'n', count(*)) as c
        from public.sessions where city is not null and last_seen >= s group by city, country order by count(*) desc limit 15) x), '[]'::jsonb),
    'browsers', coalesce((select jsonb_object_agg(coalesce(browser, '?'), n) from (select browser, count(*) n from public.sessions where last_seen >= s group by browser) x), '{}'::jsonb),
    'os', coalesce((select jsonb_object_agg(coalesce(os, '?'), n) from (select os, count(*) n from public.sessions where last_seen >= s group by os) x), '{}'::jsonb),
    'forms', coalesce((select jsonb_object_agg(coalesce(form, '?'), n) from (select form, count(*) n from public.sessions where last_seen >= s group by form) x), '{}'::jsonb),
    'live', coalesce((select jsonb_agg(jsonb_build_object('lat', la, 'lon', lo, 'n', n, 'city', ci, 'cc', co)) from (
        select round(lat::numeric, 2) la, round(lon::numeric, 2) lo, count(*) n, max(city) ci, max(country) co from public.sessions
        where last_seen > now() - interval '120 seconds' and lat is not null group by 1, 2 order by n desc limit 2000) x), '[]'::jsonb),
    'visitors', coalesce((select jsonb_agg(jsonb_build_object('lat', la, 'lon', lo, 'n', n, 'city', ci, 'cc', co)) from (
        select round(lat::numeric, 2) la, round(lon::numeric, 2) lo, count(*) n, max(city) ci, max(country) co from public.sessions
        where lat is not null and last_seen >= s group by 1, 2 order by n desc limit 3000) x), '[]'::jsonb),
    'points', coalesce((select jsonb_agg(jsonb_build_object('k', kind, 'lat', la, 'lon', lo, 'n', n, 'city', ci, 'cc', co)) from (
        select kind, round(lat::numeric, 2) la, round(lon::numeric, 2) lo, count(*) n, max(city) ci, max(country) co from public.geo_events
        where kind in ('upload', 'download') and lat is not null and at >= s group by 1, 2, 3 order by n desc limit 3000) x), '[]'::jsonb),
    'arcs', coalesce((select jsonb_agg(jsonb_build_object('a', from_lat, 'b', from_lon, 'c', lat, 'd', lon)) from (
        select from_lat, from_lon, lat, lon from public.geo_events
        where kind = 'download' and from_lat is not null and lat is not null and at >= s order by at desc limit 600) x), '[]'::jsonb),
    'feed', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'label', label, 'country', country, 'city', city, 'bytes', bytes, 'at', at) order by at desc) from (
        select * from public.geo_events where at >= s order by at desc limit 300) x), '[]'::jsonb),
    'exactSeen', coalesce((select jsonb_agg(jsonb_build_object('lat', lat, 'lon', lon, 'acc', acc, 'label', label,
            'city', city, 'cc', country, 'at', loc_at, 'online', last_seen > now() - interval '120 seconds') order by loc_at desc) from (
            select lat, lon, acc, label, city, country, loc_at, last_seen from public.sessions
            where precise and lat is not null and loc_at >= s limit 5000) x), '[]'::jsonb),
    'exact', coalesce((select jsonb_agg(jsonb_build_object('lat', lat, 'lon', lon, 'acc', acc, 'label', label,
            'city', city, 'cc', country, 'at', loc_at) order by loc_at desc) from (
            select lat, lon, acc, label, city, country, loc_at from public.sessions
            where precise and last_seen > now() - interval '120 seconds' and loc_at > greatest(s, now() - interval '10 minutes')
              and lat is not null limit 2000) x), '[]'::jsonb),
    'transfers', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'fileName', t.file_name, 'size', t.size,
        'status', t.status, 'downloads', t.downloads, 'failed', t.failed, 'country', t.country, 'city', t.city,
        'device', t.sender_device, 'createdAt', t.created_at, 'expiresAt', t.expires_at,
        'views', (select count(distinct device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'view'),
        'reports', (select count(distinct device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'report'),
        'watchers', (select count(*) from public.sessions x where x.viewing = t.id and x.last_seen > now() - interval '120 seconds'))
        order by t.created_at desc) from (select * from public.transfers where expires_at > now() and created_at >= s order by created_at desc limit 200) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.orbit_admin_overview_since(text, timestamptz) from public, authenticated;
grant execute on function public.orbit_admin_overview_since(text, timestamptz) to anon;
