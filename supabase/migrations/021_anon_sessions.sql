-- 021: anonymous sessions last 5 to 30 minutes, then burn. What burns: the anonymous spaces the session made and
-- everything in them (files expire at once and the reaper removes them from storage, notes and tasks expire, members
-- are marked gone). What stays, for the admin only: the session's record (alias, length, start and end in UTC with the
-- device's time zone, how it ended, the IP and its rough area), 90 days.

create table if not exists private.anon_sessions (
  key text primary key,          -- a keyed hash of the session id; the raw id only lives on the device
  alias text not null,
  min int not null,
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  ended_at timestamptz,
  end_reason text,               -- exit (turned off) or timer (ran out, or the tab was closed)
  tz text,
  utc_offset int,                -- minutes east of UTC, as the device reported it
  ip text, country text, city text, lat double precision, lon double precision,
  spaces text[] not null default '{}'
);
create index if not exists anon_sessions_open on private.anon_sessions (ends_at) where ended_at is null;

alter table public.spaces add column if not exists burnt_at timestamptz;

create or replace function public.orbit_anon_session_start(p_secret text, p_key text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare m int := greatest(5, least(30, coalesce((p->>'min')::int, 30)));
begin
  perform private.check(p_secret);
  insert into private.anon_sessions (key, alias, min, ends_at, tz, utc_offset, ip, country, city, lat, lon)
  values (left(p_key, 64), left(coalesce(p->>'alias', 'Anon'), 24), m, now() + make_interval(mins => m),
    nullif(left(p->>'tz', 64), ''), nullif(p->>'offset', '')::int, nullif(left(p->>'ip', 64), ''),
    nullif(left(p->>'country', 2), ''), nullif(left(p->>'city', 60), ''),
    nullif(p->>'lat', '')::double precision, nullif(p->>'lon', '')::double precision)
  on conflict (key) do nothing;
end $$;

-- a space made during the session is filed under it, so it burns with it
create or replace function public.orbit_anon_session_space(p_secret text, p_key text, p_slug text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  update private.anon_sessions set spaces = array_append(spaces, left(p_slug, 64))
  where key = p_key and ended_at is null and not (left(p_slug, 64) = any(spaces))
    and exists (select 1 from public.spaces s where s.slug = p_slug and s.anon);
end $$;

-- burn anonymous spaces: everything in them expires now; the reapers take the rest
create or replace function private.anon_burn(p_slugs text[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_slugs is null or cardinality(p_slugs) = 0 then return; end if;
  update public.spaces set burnt_at = now() where anon and slug = any(p_slugs) and burnt_at is null;
  update public.transfers set expires_at = now()
    where expires_at > now() and substring(name from '^⟪s=([^;⟫]+)') = any(p_slugs);
  update public.bubbles set expires_at = now() where expires_at > now() and space = any(p_slugs);
  update public.tasks set expires_at = now() where expires_at > now() and space = any(p_slugs);
  update public.space_members set gone = true where slug = any(p_slugs) and not gone;
end $$;

create or replace function public.orbit_anon_session_end(p_secret text, p_key text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare sl text[];
begin
  perform private.check(p_secret);
  update private.anon_sessions set ended_at = now(), end_reason = case when p_reason = 'timer' then 'timer' else 'exit' end
  where key = p_key and ended_at is null
  returning spaces into sl;
  perform private.anon_burn(sl);
end $$;

-- sessions nobody ended (the tab was closed): they burn when their time is up
create or replace function public.orbit_anon_sessions_sweep(p_secret text) returns void
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  perform private.check(p_secret);
  for r in update private.anon_sessions set ended_at = ends_at, end_reason = 'timer'
           where ended_at is null and ends_at < now() returning spaces loop
    perform private.anon_burn(r.spaces);
  end loop;
end $$;

create or replace function public.orbit_admin_anon_sessions(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'alias', alias, 'min', min, 'start', started_at, 'ends', ends_at, 'ended', ended_at, 'reason', end_reason,
      'tz', tz, 'offset', utc_offset, 'ip', ip, 'cc', country, 'city', city, 'lat', lat, 'lon', lon,
      'spaces', cardinality(spaces)) order by started_at desc)
    from (select * from private.anon_sessions where started_at > now() - interval '90 days' order by started_at desc limit 500) s), '[]'::jsonb);
end $$;

revoke all on function public.orbit_anon_session_start(text, text, jsonb), public.orbit_anon_session_space(text, text, text),
  public.orbit_anon_session_end(text, text, text), public.orbit_anon_sessions_sweep(text), public.orbit_admin_anon_sessions(text) from public, authenticated;
revoke all on function private.anon_burn(text[]) from public, anon, authenticated;
grant execute on function public.orbit_anon_session_start(text, text, jsonb), public.orbit_anon_session_space(text, text, text),
  public.orbit_anon_session_end(text, text, text), public.orbit_anon_sessions_sweep(text), public.orbit_admin_anon_sessions(text) to anon;
