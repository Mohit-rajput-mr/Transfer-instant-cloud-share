-- 020: "Stay anonymous". Other users learn nothing about anonymous devices (no device, network or place). The admin
-- keeps their IP address and its rough area for abuse and legal requests (private.anon_online, 90 days).
-- Normal traffic is unchanged. Apply before deploying the app that uses it.

-- 1. objects sent anonymously carry the name tag a=1 (lib/spaces.ts tagName): the flag is read from the stored name
alter table public.transfers
  add column if not exists anon boolean generated always as (name ~ '^⟪([^⟫]*;)?a=1(;|⟫)') stored;

-- 2. nobody is ever given an anonymous object's network hash (it is only a rotating rate-limit key anyway)
do $$
declare d text := pg_get_functiondef('private.pub(public.transfers)'::regprocedure);
begin
  if position('t.anon' in d) = 0 then
    execute replace(d, '''netHash'', t.net_hash', '''netHash'', case when t.anon then null else t.net_hash end');
  end if;
  if position('t.anon' in pg_get_functiondef('private.pub(public.transfers)'::regprocedure)) = 0 then
    raise warning '020: private.pub not patched, anonymous objects still list a netHash';
  end if;
end $$;

-- 3. anonymous spaces
alter table public.spaces add column if not exists anon boolean not null default false;

create or replace function public.orbit_space_create_anon(p_secret text, p_slug text, p_meta text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  insert into public.spaces (slug, meta, anon) values (p_slug, p_meta, true) on conflict (slug) do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- leaving an anonymous space deletes the member row (a named space only marks it gone)
create or replace function public.orbit_space_leave(p_secret text, p_slug text, p_dh text, p_kick boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if not p_kick and exists (select 1 from public.spaces where slug = p_slug and anon) then
    delete from public.space_members where slug = p_slug and dh = p_dh;
    return;
  end if;
  update public.space_members set gone = true where slug = p_slug and dh = p_dh;
  if p_kick then
    insert into public.space_kicked (slug, dh) values (p_slug, p_dh) on conflict do nothing;
  end if;
end $$;

-- 4. anonymous heartbeats: counted as online and shown to nobody else. For abuse and legal requests the admin keeps
--    each anonymous device's IP address and the IP's rough area (city), 90 days (see the privacy page).
create table if not exists private.anon_online (id text primary key, last_seen timestamptz not null default now());
alter table private.anon_online
  add column if not exists first_seen timestamptz not null default now(),
  add column if not exists ip text,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists lat double precision,
  add column if not exists lon double precision;

create or replace function public.orbit_pulse_anon(p_secret text, p_id text, p_ip text default null, p_geo jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  insert into private.anon_online (id, ip, country, city, lat, lon)
  values (left(p_id, 40), nullif(left(p_ip, 64), ''), nullif(left(p_geo->>'country', 2), ''), nullif(left(p_geo->>'city', 60), ''),
    nullif(p_geo->>'lat', '')::double precision, nullif(p_geo->>'lon', '')::double precision)
  on conflict (id) do update set last_seen = now(),
    ip = coalesce(excluded.ip, private.anon_online.ip),
    country = coalesce(excluded.country, private.anon_online.country),
    city = coalesce(excluded.city, private.anon_online.city),
    lat = coalesce(excluded.lat, private.anon_online.lat),
    lon = coalesce(excluded.lon, private.anon_online.lon);
end $$;
drop function if exists public.orbit_pulse_anon(text, text);

-- admin globe: anonymous use per place (rounded to ~10 km), with the IPs seen there
create or replace function public.orbit_admin_anon(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((
    with r as (
      select round(lat::numeric, 1) as rl, round(lon::numeric, 1) as ro, * from private.anon_online
      where lat is not null and lon is not null and last_seen > now() - interval '90 days'
    ), g as (
      select rl, ro, max(city) as city, max(country) as cc, count(*) as n,
        count(*) filter (where last_seen > now() - interval '120 seconds') as online,
        max(last_seen) as last, min(first_seen) as first,
        (array_agg(distinct ip) filter (where ip is not null))[1:12] as ips
      from r group by rl, ro order by max(last_seen) desc limit 2000
    )
    select jsonb_agg(jsonb_build_object('lat', rl, 'lon', ro, 'city', city, 'cc', cc, 'n', n, 'online', online,
      'last', last, 'first', first, 'ips', to_jsonb(ips)) order by last desc) from g
  ), '[]'::jsonb);
end $$;

-- 5. turning anonymous on: Orbi forgets this browser's heartbeat row (label, browser, network hash, IP place, last GPS spot)
create or replace function public.orbit_session_forget(p_secret text, p_device text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  delete from public.sessions where device_id = p_device;
end $$;

-- 6. "N devices in orbit" counts anonymous devices too (no-op if the live body differs)
do $$
declare f record; d text;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('orbit_list2', 'orbit_list3') loop
    d := pg_get_functiondef(f.oid);
    if position('anon_online' in d) = 0 then
      execute replace(d,
        'select count(*) into online from public.sessions where last_seen > now() - interval ''120 seconds'';',
        'select (select count(*) from public.sessions where last_seen > now() - interval ''120 seconds'')
              + (select count(*) from private.anon_online where last_seen > now() - interval ''120 seconds'') into online;');
    end if;
  end loop;
end $$;

-- 7. clean-up with every reap (lib/server.ts reap): burnt notes/tasks in anonymous spaces are deleted, not hidden;
--    an anonymous space and its member list go 7 days after it was made
create or replace function public.orbit_reap_anon(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  delete from private.anon_online where last_seen < now() - interval '90 days';
  delete from public.bubbles b using public.spaces s where s.anon and b.space = s.slug and b.expires_at < now() - interval '10 minutes';
  delete from public.tasks t using public.spaces s where s.anon and t.space = s.slug and t.expires_at < now() - interval '10 minutes';
  delete from public.bubbles where space in (select slug from public.spaces where anon and created_at < now() - interval '7 days');
  delete from public.tasks where space in (select slug from public.spaces where anon and created_at < now() - interval '7 days');
  delete from public.space_kicked where slug in (select slug from public.spaces where anon and created_at < now() - interval '7 days');
  delete from public.space_members where slug in (select slug from public.spaces where anon and created_at < now() - interval '7 days');
  delete from public.spaces where anon and created_at < now() - interval '7 days';
end $$;

revoke all on function public.orbit_space_create_anon(text, text, text), public.orbit_space_leave(text, text, text, boolean),
  public.orbit_pulse_anon(text, text, text, jsonb), public.orbit_session_forget(text, text), public.orbit_reap_anon(text), public.orbit_admin_anon(text) from public, authenticated;
grant execute on function public.orbit_space_create_anon(text, text, text), public.orbit_space_leave(text, text, text, boolean),
  public.orbit_pulse_anon(text, text, text, jsonb), public.orbit_session_forget(text, text), public.orbit_reap_anon(text), public.orbit_admin_anon(text) to anon;
