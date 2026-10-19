-- 022: knock on an anonymous space with its 4-letter code. Anonymous spaces are never listed or shown online; typing
-- the 4 letters (the space's title code "Anonymous · D3F2", or the alias "Anon-A1B2" of the anonymous person who made
-- it, while their session runs) leaves a knock. Someone inside taps Let in, and their browser hands the knocker the
-- invite (code + key) sealed to the knocker's one-time public key: the server only ever stores the sealed box.
-- Knocks count for 10 minutes; old rows are ignored by every query (the reaper may clear them later).

create table if not exists private.space_knocks (
  id text primary key,
  slug text not null,
  pub text not null,                 -- the knocker's one-time ECDH public key (base64)
  at timestamptz not null default now(),
  status text not null default 'wait', -- wait | in | no
  box text                           -- the invite sealed to pub (base64), only when let in
);
create index if not exists space_knocks_slug on private.space_knocks (slug, at);

-- the live anonymous spaces a 4-letter code points at, newest first
create or replace function private.knock_targets(p_code text) returns text[]
language sql security definer set search_path = '' stable as $$
  select coalesce(array_agg(slug order by created_at desc), '{}') from (
    select s.slug, s.created_at from public.spaces s
    where s.anon and s.burnt_at is null and s.created_at > now() - interval '7 days'
      and substring(s.slug from 6 for 4) = lower(p_code)
    union
    select s.slug, s.created_at from private.anon_sessions a
    cross join lateral unnest(a.spaces) as x(slug)
    join public.spaces s on s.slug = x.slug
    where a.ended_at is null and a.ends_at > now() and lower(a.alias) = 'anon-' || lower(p_code)
      and s.anon and s.burnt_at is null
  ) t;
$$;

-- knock: returns the space knocked on, or null (no such code, or too many knocks waiting there already)
create or replace function public.orbit_knock(p_secret text, p_id text, p_code text, p_pub text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_slug text;
begin
  perform private.check(p_secret);
  if p_code !~ '^[A-Za-z0-9]{4}$' or length(p_pub) > 200 or p_id !~ '^[a-z0-9]{16,32}$' then return null; end if;
  v_slug := (private.knock_targets(p_code))[1];
  if v_slug is null then return null; end if;
  if (select count(*) from private.space_knocks where slug = v_slug and status = 'wait' and at > now() - interval '10 minutes') >= 8 then
    return null;
  end if;
  insert into private.space_knocks (id, slug, pub) values (p_id, v_slug, p_pub) on conflict (id) do nothing;
  return v_slug;
end $$;

-- the knocker checks: { status, slug, box }
create or replace function public.orbit_knock_get(p_secret text, p_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select jsonb_build_object('status', case when k.at < now() - interval '10 minutes' and k.status = 'wait' then 'gone' else k.status end, 'slug', k.slug, 'box', k.box)
          from private.space_knocks k where k.id = p_id);
end $$;

-- people inside see the waiting knocks (membership is checked by the app first)
create or replace function public.orbit_knock_list(p_secret text, p_slug text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'pub', pub, 'at', at) order by at)
                   from private.space_knocks where slug = p_slug and status = 'wait' and at > now() - interval '10 minutes'), '[]'::jsonb);
end $$;

-- let in (with the sealed invite) or turn away; only a knock still waiting on this space
create or replace function public.orbit_knock_answer(p_secret text, p_slug text, p_id text, p_allow boolean, p_box text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if p_allow and (p_box is null or length(p_box) > 2000) then return false; end if;
  update private.space_knocks set status = case when p_allow then 'in' else 'no' end, box = case when p_allow then p_box end
  where id = p_id and slug = p_slug and status = 'wait' and at > now() - interval '10 minutes';
  return found;
end $$;

revoke all on function public.orbit_knock(text, text, text, text), public.orbit_knock_get(text, text),
  public.orbit_knock_list(text, text), public.orbit_knock_answer(text, text, text, boolean, text) from public, authenticated;
grant execute on function public.orbit_knock(text, text, text, text), public.orbit_knock_get(text, text),
  public.orbit_knock_list(text, text), public.orbit_knock_answer(text, text, text, boolean, text) to anon;
revoke all on function private.knock_targets(text) from public, anon, authenticated;
