-- ORBIT 002: heartbeat sessions, geo analytics, daily stats, admin HQ, scale-friendly list.
-- Apply after 001_core.sql. Functions here replace/extend the ones in 001.

create table if not exists public.sessions (
  device_id text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  hits int not null default 1,
  visits int not null default 1,
  viewing text,
  label text, browser text, os text, form text,
  country text, region text, city text, lat real, lon real,
  net_hash text
);
create index if not exists sessions_last_seen on public.sessions(last_seen);
create index if not exists sessions_viewing on public.sessions(viewing) where viewing is not null;
create index if not exists sessions_country on public.sessions(country);

create table if not exists public.geo_events (
  id bigint generated always as identity primary key,
  kind text not null,                -- visit | upload | download
  transfer_id text, bytes bigint, label text,
  country text, city text, lat real, lon real,
  from_lat real, from_lon real,      -- sender location, for transfer arcs
  at timestamptz not null default now()
);
create index if not exists geo_events_at on public.geo_events(at);
create index if not exists geo_events_kind_at on public.geo_events(kind, at);

create table if not exists public.stats_daily (
  day date primary key,
  uploads int not null default 0, downloads int not null default 0,
  bytes_up bigint not null default 0, bytes_down bigint not null default 0,
  views int not null default 0, reports int not null default 0
);

create table if not exists private.login_attempts (net_hash text not null, at timestamptz not null default now());
create index if not exists login_attempts_net on private.login_attempts(net_hash, at);

alter table public.transfers add column if not exists country text;
alter table public.transfers add column if not exists city text;
alter table public.transfers add column if not exists lat real;
alter table public.transfers add column if not exists lon real;
create index if not exists transfer_events_lookup on public.transfer_events(transfer_id, kind, device_id);
create index if not exists transfers_net_created on public.transfers(net_hash, created_at);

alter table public.sessions enable row level security;
alter table public.geo_events enable row level security;
alter table public.stats_daily enable row level security;
revoke all on public.sessions, public.geo_events, public.stats_daily from anon, authenticated;

-- The live function bodies (orbit_pulse, orbit_list2, orbit_create, orbit_finalize, orbit_unlock(+p_geo),
-- orbit_view, orbit_report, orbit_reap, orbit_admin_overview, orbit_admin_attempts, orbit_admin_destroy,
-- private.bump, private.pub) are exported below from the running database.

create or replace function private.bump(p_col text, p_n bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  execute format('insert into public.stats_daily as d (day, %1$I) values (current_date, $1)
                  on conflict (day) do update set %1$I = d.%1$I + excluded.%1$I', p_col) using p_n;
end $$;

create or replace function private.pub(t public.transfers) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'fileName', t.file_name, 'mime', t.mime, 'size', t.size,
    'salt', t.salt, 'iterations', t.iterations, 'hue', t.hue, 'status', t.status,
    'netHash', t.net_hash, 'maxDownloads', t.max_downloads, 'downloads', t.downloads,
    'devices', (select count(distinct e.device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'download'),
    'views', (select count(distinct e.device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'view'),
    'createdAt', t.created_at, 'expiresAt', t.expires_at)
$$;

create or replace function public.orbit_pulse(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare was timestamptz; fresh boolean;
begin
  perform private.check(p_secret);
  select last_seen into was from public.sessions where device_id = p->>'deviceId';
  fresh := was is null or was < now() - interval '30 minutes';
  insert into public.sessions as s (device_id, viewing, label, browser, os, form, country, region, city, lat, lon, net_hash)
  values (p->>'deviceId', nullif(p->>'viewing', ''), p->>'label', p->>'browser', p->>'os', p->>'form',
          nullif(p->>'country', ''), nullif(p->>'region', ''), nullif(p->>'city', ''),
          nullif(p->>'lat', '')::real, nullif(p->>'lon', '')::real, p->>'net')
  on conflict (device_id) do update set
    last_seen = now(), hits = s.hits + 1,
    visits = s.visits + case when s.last_seen < now() - interval '30 minutes' then 1 else 0 end,
    viewing = excluded.viewing, label = excluded.label, browser = excluded.browser, os = excluded.os, form = excluded.form,
    country = coalesce(excluded.country, s.country), region = coalesce(excluded.region, s.region),
    city = coalesce(excluded.city, s.city), lat = coalesce(excluded.lat, s.lat), lon = coalesce(excluded.lon, s.lon),
    net_hash = excluded.net_hash;
  if fresh then
    insert into public.geo_events (kind, label, country, city, lat, lon)
    values ('visit', p->>'label', nullif(p->>'country', ''), nullif(p->>'city', ''), nullif(p->>'lat', '')::real, nullif(p->>'lon', '')::real);
  end if;
end $$;

create or replace function public.orbit_list2(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare items jsonb; online int;
begin
  perform private.check(p_secret);
  with w as (
    select viewing, count(*) as n from public.sessions
    where viewing is not null and last_seen > now() - interval '50 seconds' group by viewing
  ), t as (
    select * from public.transfers where status in ('ready','sealed') and expires_at > now()
    order by created_at desc limit 80
  )
  select coalesce(jsonb_agg(private.pub(t) || jsonb_build_object('watchers', coalesce(w.n, 0)) order by t.created_at desc), '[]'::jsonb)
    into items from t left join w on w.viewing = t.id;
  select count(*) into online from public.sessions where last_seen > now() - interval '50 seconds';
  return jsonb_build_object('items', items, 'online', online);
end $$;

create or replace function public.orbit_create(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if (select count(*) from public.transfers where net_hash = p->>'netHash' and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.transfers (id, name, file_name, mime, size, blob_pathname, salt, iterations, nonce, chunk_size,
    auth_hash, owner_hash, net_hash, sender_device, max_downloads, hue, country, city, lat, lon)
  values (p->>'id', p->>'name', p->>'fileName', coalesce(p->>'mime','application/octet-stream'), (p->>'size')::bigint,
    p->>'pathname', p->>'salt', (p->>'iterations')::int, p->>'nonce', (p->>'chunkSize')::int,
    p->>'authHash', p->>'ownerHash', p->>'netHash', p->>'device', nullif(p->>'maxDownloads','')::int, coalesce((p->>'hue')::int,0),
    nullif(p->>'country',''), nullif(p->>'city',''), nullif(p->>'lat','')::real, nullif(p->>'lon','')::real);
end $$;

create or replace function public.orbit_finalize(p_secret text, p_id text, p_owner_hash text, p_url text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  update public.transfers set blob_url = p_url, status = 'ready', expires_at = now() + interval '30 minutes'
   where id = p_id and owner_hash = p_owner_hash and status = 'uploading' returning * into t;
  if t.id is null then return null; end if;
  perform private.bump('uploads', 1);
  perform private.bump('bytes_up', t.size);
  insert into public.geo_events (kind, transfer_id, bytes, label, country, city, lat, lon)
  values ('upload', t.id, t.size, t.sender_device, t.country, t.city, t.lat, t.lon);
  return private.pub(t);
end $$;

create or replace function public.orbit_unlock(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and expires_at > now() for update;
  if t.id is null or t.status not in ('ready','sealed') then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.failed >= 12 then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
  if t.auth_hash <> p_auth_hash then
    update public.transfers set failed = failed + 1 where id = p_id;
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'fail', p_device, p_label);
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'left', greatest(0, 11 - t.failed));
  end if;
  if t.status = 'sealed' then return jsonb_build_object('ok', false, 'reason', 'sealed'); end if;
  update public.transfers set downloads = downloads + 1,
    status = case when max_downloads is not null and downloads + 1 >= max_downloads then 'sealed' else status end,
    expires_at = case when max_downloads is not null and downloads + 1 >= max_downloads then least(expires_at, now() + interval '10 minutes') else expires_at end
    where id = p_id returning * into t;
  insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'download', p_device, p_label);
  perform private.bump('downloads', 1);
  perform private.bump('bytes_down', t.size);
  insert into public.geo_events (kind, transfer_id, bytes, label, country, city, lat, lon, from_lat, from_lon)
  values ('download', t.id, t.size, p_label, nullif(p_geo->>'country',''), nullif(p_geo->>'city',''),
          nullif(p_geo->>'lat','')::real, nullif(p_geo->>'lon','')::real, t.lat, t.lon);
  return jsonb_build_object('ok', true, 'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size,
    'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $$;

create or replace function public.orbit_view(p_secret text, p_id text, p_device text, p_label text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if exists (select 1 from public.transfers where id = p_id and expires_at > now())
     and not exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'view' and device_id = p_device) then
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'view', p_device, p_label);
    perform private.bump('views', 1);
  end if;
end $$;

create or replace function public.orbit_report(p_secret text, p_id text, p_device text, p_label text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  if not exists (select 1 from public.transfers where id = p_id and expires_at > now()) then
    return jsonb_build_object('ok', false);
  end if;
  if not exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'report' and device_id = p_device) then
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'report', p_device, p_label);
    perform private.bump('reports', 1);
  end if;
  select count(distinct device_id) into n from public.transfer_events where transfer_id = p_id and kind = 'report';
  if n >= 3 then update public.transfers set expires_at = now() where id = p_id; end if;
  return jsonb_build_object('ok', true, 'reports', n, 'removed', n >= 3);
end $$;

create or replace function public.orbit_admin_attempts(p_secret text, p_net text, p_failed boolean) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  if p_failed then insert into private.login_attempts (net_hash) values (p_net); end if;
  select count(*) into n from private.login_attempts where net_hash = p_net and at > now() - interval '15 minutes';
  return n;
end $$;

create or replace function public.orbit_admin_destroy(p_secret text, p_id text) returns text
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  perform private.check(p_secret);
  delete from public.transfers where id = p_id returning coalesce(blob_url, blob_pathname) into r;
  return r;
end $$;

create or replace function public.orbit_reap(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform private.check(p_secret);
  with d as (delete from public.transfers where expires_at <= now() returning coalesce(blob_url, blob_pathname) as u)
  select coalesce(jsonb_agg(u), '[]'::jsonb) into res from d;
  delete from public.geo_events where at < now() - interval '30 days';
  delete from private.login_attempts where at < now() - interval '1 day';
  update public.sessions set viewing = null where viewing is not null and last_seen < now() - interval '2 minutes';
  return res;
end $$;

-- orbit_admin_overview: one round-trip for the whole HQ dashboard. Map points are pre-clustered
-- on a 0.1° grid (~11 km) and capped, so the payload stays small no matter how many devices exist.
-- (Full body: see the running database; mirrors src/components/admin/types.ts `Overview`.)

revoke all on function private.bump(text, bigint) from public, anon, authenticated;
revoke execute on function public.orbit_pulse(text,jsonb), public.orbit_list2(text), public.orbit_unlock(text,text,text,text,text,jsonb),
  public.orbit_admin_attempts(text,text,boolean), public.orbit_admin_destroy(text,text) from public, authenticated;
grant execute on function public.orbit_pulse(text,jsonb), public.orbit_list2(text), public.orbit_unlock(text,text,text,text,text,jsonb),
  public.orbit_admin_attempts(text,text,boolean), public.orbit_admin_destroy(text,text) to anon;
