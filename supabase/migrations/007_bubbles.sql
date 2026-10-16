-- 007: bubble text: short plain-text notes that float in the void, readable by anyone (or by a space's members).
-- They burn like objects: hidden once expires_at passes; the sender can burn theirs early.
create table if not exists public.bubbles (
  id text primary key,
  body text not null,
  by text,
  from_key text,
  owner_hash text not null,
  net_hash text,
  space text,
  hue int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists bubbles_live on public.bubbles (expires_at);
alter table public.bubbles enable row level security;
revoke all on public.bubbles from anon, authenticated;

create or replace function public.orbit_bubble_add(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if (select count(*) from public.bubbles where net_hash = p->>'net' and created_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0429';
  end if;
  insert into public.bubbles (id, body, by, from_key, owner_hash, net_hash, space, hue, expires_at)
  values (p->>'id', p->>'body', nullif(p->>'by',''), nullif(p->>'from',''), p->>'owner', p->>'net', nullif(p->>'space',''),
    coalesce((p->>'hue')::int, 0), now() + make_interval(mins => (p->>'life')::int));
end $$;

create or replace function public.orbit_bubble_list(p_secret text, p_space text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'text', body, 'by', by, 'from', from_key, 'hue', hue,
      'createdAt', created_at, 'expiresAt', expires_at) order by created_at desc)
    from (select * from public.bubbles where expires_at > now() and coalesce(space, '') = coalesce(p_space, '')
          order by created_at desc limit 200) x), '[]'::jsonb);
end $$;

-- burning early: the bubble just expires now
create or replace function public.orbit_bubble_burn(p_secret text, p_id text, p_owner_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.bubbles set expires_at = now() where id = p_id and owner_hash = p_owner_hash and expires_at > now();
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.orbit_bubble_add(text, jsonb), public.orbit_bubble_list(text, text), public.orbit_bubble_burn(text, text, text) from public;
grant execute on function public.orbit_bubble_add(text, jsonb), public.orbit_bubble_list(text, text), public.orbit_bubble_burn(text, text, text) to anon;
