-- 004: Spaces in Supabase (applied to the live project). They used the Vercel Blob store, which is suspended.
-- Same secret-gated SECURITY DEFINER pattern as every other function; tables are closed to anon.

create table if not exists public.spaces (
  slug text primary key,
  meta text not null,              -- AES-GCM sealed by the app (key derived from ORBIT_SECRET)
  created_at timestamptz not null default now()
);
create table if not exists public.space_members (
  slug text not null references public.spaces(slug),
  dh text not null,                -- keyed hash of the device id
  handle text not null,
  gone boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (slug, dh)
);
create table if not exists public.space_kicked (
  slug text not null references public.spaces(slug),
  dh text not null,
  at timestamptz not null default now(),
  primary key (slug, dh)
);
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_kicked enable row level security;
revoke all on public.spaces, public.space_members, public.space_kicked from anon, authenticated;

create or replace function public.orbit_space_get(p_secret text, p_slug text) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select meta from public.spaces where slug = p_slug);
end $$;

-- first one wins: true only for the caller that created it
create or replace function public.orbit_space_create(p_secret text, p_slug text, p_meta text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  insert into public.spaces (slug, meta) values (p_slug, p_meta) on conflict (slug) do nothing;
  get diagnostics n = row_count;
  return n = 1;
end $$;

create or replace function public.orbit_space_roster(p_secret text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('dh', dh, 'handle', handle) order by joined_at)
                           from public.space_members where slug = p_slug and not gone), '[]'::jsonb),
    'kicked', coalesce((select jsonb_agg(dh) from public.space_kicked where slug = p_slug), '[]'::jsonb));
end $$;

create or replace function public.orbit_space_join(p_secret text, p_slug text, p_dh text, p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  insert into public.space_members (slug, dh, handle) values (p_slug, p_dh, p_handle)
  on conflict (slug, dh) do update set handle = excluded.handle, gone = false;
end $$;

create or replace function public.orbit_space_leave(p_secret text, p_slug text, p_dh text, p_kick boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  update public.space_members set gone = true where slug = p_slug and dh = p_dh;
  if p_kick then
    insert into public.space_kicked (slug, dh) values (p_slug, p_dh) on conflict do nothing;
  end if;
end $$;

-- every space (newest first) with its sealed meta, for search and HQ
create or replace function public.orbit_space_index(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('slug', s.slug, 'meta', s.meta,
      'members', (select coalesce(jsonb_agg(m.handle order by m.joined_at), '[]'::jsonb) from public.space_members m where m.slug = s.slug and not m.gone),
      'kicked', (select count(*) from public.space_kicked k where k.slug = s.slug)) order by s.created_at desc)
    from (select * from public.spaces order by created_at desc limit 500) s), '[]'::jsonb);
end $$;

revoke execute on function public.orbit_space_get(text, text), public.orbit_space_create(text, text, text), public.orbit_space_roster(text, text),
  public.orbit_space_join(text, text, text, text), public.orbit_space_leave(text, text, text, boolean), public.orbit_space_index(text) from public, authenticated;
grant execute on function public.orbit_space_get(text, text), public.orbit_space_create(text, text, text), public.orbit_space_roster(text, text),
  public.orbit_space_join(text, text, text, text), public.orbit_space_leave(text, text, text, boolean), public.orbit_space_index(text) to anon;
