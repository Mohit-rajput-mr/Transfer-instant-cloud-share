-- 005 (applied): 300 launches per network per hour; record cloud (R2) copies for HQ.

create or replace function public.orbit_create(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if (select count(*) from public.transfers where net_hash = p->>'netHash' and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.transfers (id, name, file_name, mime, size, blob_pathname, salt, iterations, nonce, chunk_size,
    auth_hash, owner_hash, net_hash, sender_device, max_downloads, hue, country, city, lat, lon)
  values (p->>'id', p->>'name', p->>'fileName', coalesce(p->>'mime','application/octet-stream'), (p->>'size')::bigint,
    p->>'pathname', p->>'salt', (p->>'iterations')::int, p->>'nonce', (p->>'chunkSize')::int,
    p->>'authHash', p->>'ownerHash', p->>'netHash', p->>'device', nullif(p->>'maxDownloads','')::int, coalesce((p->>'hue')::int,0),
    nullif(p->>'country',''), nullif(p->>'city',''), nullif(p->>'lat','')::real, nullif(p->>'lon','')::real);
end $$;

create table if not exists public.cloud_copies (id text primary key, bytes bigint not null, saved_at timestamptz not null default now());
create table if not exists public.cloud_daily (day date primary key, copies int not null default 0, bytes bigint not null default 0);
alter table public.cloud_copies enable row level security;
alter table public.cloud_daily enable row level security;
revoke all on public.cloud_copies, public.cloud_daily from anon, authenticated;

create or replace function public.orbit_cloud_saved(p_secret text, p_id text, p_bytes bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  insert into public.cloud_copies (id, bytes) values (p_id, p_bytes) on conflict (id) do nothing;
  get diagnostics n = row_count;
  if n = 1 then
    insert into public.cloud_daily as c (day, copies, bytes) values (current_date, 1, p_bytes)
    on conflict (day) do update set copies = c.copies + 1, bytes = c.bytes + excluded.bytes;
  end if;
end $$;

create or replace function public.orbit_cloud_now(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'ids', coalesce((select jsonb_agg(c.id) from public.cloud_copies c join public.transfers t on t.id = c.id where t.expires_at > now()), '[]'::jsonb),
    'bytes', coalesce((select sum(c.bytes) from public.cloud_copies c join public.transfers t on t.id = c.id where t.expires_at > now()), 0),
    'today', coalesce((select jsonb_build_object('copies', copies, 'bytes', bytes) from public.cloud_daily where day = current_date), '{"copies":0,"bytes":0}'::jsonb),
    'total', (select jsonb_build_object('copies', coalesce(sum(copies), 0), 'bytes', coalesce(sum(bytes), 0)) from public.cloud_daily));
end $$;

revoke execute on function public.orbit_cloud_saved(text, text, bigint), public.orbit_cloud_now(text) from public, authenticated;
grant execute on function public.orbit_cloud_saved(text, text, bigint), public.orbit_cloud_now(text) to anon;
