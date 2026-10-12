-- ORBIT — full database schema.
-- Run this once in a fresh Supabase project (SQL editor). Then copy the generated secret:
--   select v from private.config where k = 'secret';
-- and set it as ORBIT_SECRET in the Vercel project.

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.config (k text primary key, v text not null);
insert into private.config values ('secret', encode(extensions.gen_random_bytes(32), 'hex')) on conflict do nothing;

create table if not exists public.transfers (
  id text primary key,
  name text not null,
  file_name text not null,
  mime text not null default 'application/octet-stream',
  size bigint not null,
  blob_url text,
  blob_pathname text not null,
  salt text not null,
  iterations int not null,
  nonce text not null,
  chunk_size int not null,
  auth_hash text not null,
  owner_hash text not null,
  net_hash text,
  sender_device text,
  max_downloads int,
  downloads int not null default 0,
  failed int not null default 0,
  hue int not null default 0,
  status text not null default 'uploading',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 hours'
);

create table if not exists public.transfer_events (
  id bigint generated always as identity primary key,
  transfer_id text not null references public.transfers(id) on delete cascade,
  kind text not null,
  device_id text,
  device_label text,
  created_at timestamptz not null default now()
);
create index if not exists transfer_events_tid on public.transfer_events(transfer_id);
create index if not exists transfers_exp on public.transfers(expires_at);

alter table public.transfers enable row level security;
alter table public.transfer_events enable row level security;
revoke all on public.transfers, public.transfer_events from anon, authenticated;

-- Gate: every public function requires the server-only secret.
create or replace function private.check(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_secret is null or p_secret <> (select v from private.config where k = 'secret') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end $$;

create or replace function private.pub(t public.transfers) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'fileName', t.file_name, 'mime', t.mime, 'size', t.size,
    'salt', t.salt, 'iterations', t.iterations, 'hue', t.hue, 'status', t.status,
    'netHash', t.net_hash, 'maxDownloads', t.max_downloads, 'downloads', t.downloads,
    'devices', (select count(distinct e.device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'download'),
    'createdAt', t.created_at, 'expiresAt', t.expires_at)
$$;

create or replace function public.orbit_create(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  insert into public.transfers (id, name, file_name, mime, size, blob_pathname, salt, iterations, nonce, chunk_size,
    auth_hash, owner_hash, net_hash, sender_device, max_downloads, hue)
  values (p->>'id', p->>'name', p->>'fileName', coalesce(p->>'mime','application/octet-stream'), (p->>'size')::bigint,
    p->>'pathname', p->>'salt', (p->>'iterations')::int, p->>'nonce', (p->>'chunkSize')::int,
    p->>'authHash', p->>'ownerHash', p->>'netHash', p->>'device', nullif(p->>'maxDownloads','')::int, coalesce((p->>'hue')::int,0));
end $$;

create or replace function public.orbit_finalize(p_secret text, p_id text, p_owner_hash text, p_url text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  update public.transfers set blob_url = p_url, status = 'ready', expires_at = now() + interval '30 minutes'
   where id = p_id and owner_hash = p_owner_hash and status = 'uploading' returning * into t;
  if t.id is null then return null; end if;
  return private.pub(t);
end $$;

create or replace function public.orbit_list(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(private.pub(t) order by t.created_at desc) from public.transfers t
    where t.status in ('ready','sealed') and t.expires_at > now()), '[]'::jsonb);
end $$;

create or replace function public.orbit_get(p_secret text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and status in ('ready','sealed') and expires_at > now();
  if t.id is null then return null; end if;
  return private.pub(t);
end $$;

create or replace function public.orbit_unlock(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text) returns jsonb
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
  return jsonb_build_object('ok', true, 'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size,
    'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $$;

create or replace function public.orbit_owner(p_secret text, p_id text, p_owner_hash text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and owner_hash = p_owner_hash;
  if t.id is null then return null; end if;
  return private.pub(t) || jsonb_build_object('failed', t.failed, 'events',
    coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'device', e.device_label, 'deviceId', left(e.device_id, 6), 'at', e.created_at) order by e.id desc)
      from (select * from public.transfer_events where transfer_id = p_id order by id desc limit 40) e), '[]'::jsonb));
end $$;

create or replace function public.orbit_delete(p_secret text, p_id text, p_owner_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare r public.transfers;
begin
  perform private.check(p_secret);
  delete from public.transfers where id = p_id and owner_hash = p_owner_hash returning * into r;
  return coalesce(r.blob_url, r.blob_pathname);
end $$;

create or replace function public.orbit_reap(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  perform private.check(p_secret);
  with d as (delete from public.transfers where expires_at <= now() returning coalesce(blob_url, blob_pathname) as u)
  select coalesce(jsonb_agg(u), '[]'::jsonb) into res from d;
  return res;
end $$;

revoke all on function private.check(text), private.pub(public.transfers) from public, anon, authenticated;
revoke execute on function public.orbit_create(text,jsonb), public.orbit_finalize(text,text,text,text), public.orbit_list(text),
  public.orbit_get(text,text), public.orbit_unlock(text,text,text,text,text), public.orbit_owner(text,text,text),
  public.orbit_delete(text,text,text), public.orbit_reap(text) from public, authenticated;
grant execute on function public.orbit_create(text,jsonb), public.orbit_finalize(text,text,text,text), public.orbit_list(text),
  public.orbit_get(text,text), public.orbit_unlock(text,text,text,text,text), public.orbit_owner(text,text,text),
  public.orbit_delete(text,text,text), public.orbit_reap(text) to anon;

-- Optional: true 30-min auto-delete. Calls the app's reaper every 5 minutes.
-- Replace <APP_URL> and <ORBIT_SECRET> then run:
-- create extension if not exists pg_cron; create extension if not exists pg_net;
-- select cron.schedule('orbit-reap', '*/5 * * * *', $$
--   select net.http_get(url := '<APP_URL>/api/reap', headers := '{"Authorization":"Bearer <ORBIT_SECRET>"}'::jsonb)
-- $$);
