-- 017: devices that shared their location send their exact spot with the heartbeat (for Orbit's own live map in
-- the admin). Stored on the session; IP guesses don't overwrite it while it is fresh (10 min). Visit events stay
-- rough (2 decimals). orbit_admin_overview gains 'exact': online sessions with a fresh precise spot.
alter table public.sessions
  add column if not exists precise boolean not null default false,
  add column if not exists acc real,
  add column if not exists loc_at timestamptz;

create or replace function public.orbit_pulse(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path to '' as $function$
declare was timestamptz; fresh boolean; exact boolean := coalesce((p->>'precise')::boolean, false);
begin
  perform private.check(p_secret);
  select last_seen into was from public.sessions where device_id = p->>'deviceId';
  fresh := was is null or was < now() - interval '30 minutes';
  insert into public.sessions as s (device_id, viewing, label, browser, os, form, country, region, city, lat, lon, net_hash,
                                    precise, acc, loc_at)
  values (p->>'deviceId', nullif(p->>'viewing', ''), p->>'label', p->>'browser', p->>'os', p->>'form',
          nullif(p->>'country', ''), nullif(p->>'region', ''), nullif(p->>'city', ''),
          nullif(p->>'lat', '')::real, nullif(p->>'lon', '')::real, p->>'net',
          exact, case when exact then nullif(p->>'acc', '')::real end, case when exact then now() end)
  on conflict (device_id) do update set
    last_seen = now(), hits = s.hits + 1,
    visits = s.visits + case when s.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    viewing = excluded.viewing, label = excluded.label, browser = excluded.browser, os = excluded.os, form = excluded.form,
    country = coalesce(excluded.country, s.country), region = coalesce(excluded.region, s.region),
    city = coalesce(excluded.city, s.city),
    lat = case when exact then excluded.lat when s.precise and s.loc_at > now() - interval '10 minutes' then s.lat
               else coalesce(excluded.lat, s.lat) end,
    lon = case when exact then excluded.lon when s.precise and s.loc_at > now() - interval '10 minutes' then s.lon
               else coalesce(excluded.lon, s.lon) end,
    precise = exact or (s.precise and s.loc_at > now() - interval '10 minutes'),
    acc = case when exact then excluded.acc else s.acc end,
    loc_at = case when exact then now() else s.loc_at end,
    net_hash = excluded.net_hash;
  if fresh then
    insert into public.geo_events (kind, label, country, city, lat, lon)
    values ('visit', p->>'label', nullif(p->>'country', ''), nullif(p->>'city', ''),
            round(nullif(p->>'lat', '')::numeric, 2)::real, round(nullif(p->>'lon', '')::numeric, 2)::real);
  end if;
end $function$;

do $$
declare f record;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'orbit_admin_overview' loop
    if position('''exact''' in pg_get_functiondef(f.oid)) = 0 then
      execute replace(pg_get_functiondef(f.oid), '''transfers'', coalesce(',
        '''exact'', coalesce((select jsonb_agg(jsonb_build_object(''lat'', lat, ''lon'', lon, ''acc'', acc, ''label'', label,
            ''city'', city, ''cc'', country, ''at'', loc_at) order by loc_at desc) from (
            select lat, lon, acc, label, city, country, loc_at from public.sessions
            where precise and last_seen > now() - interval ''120 seconds'' and loc_at > now() - interval ''10 minutes''
              and lat is not null limit 2000) x), ''[]''::jsonb),
    ''transfers'', coalesce(');
    end if;
  end loop;
end $$;
