-- 035: what Pro and Business unlock (lib/plans.ts): long lives, a storage quota, send history and Business teams.
-- All writes go through the server (ORBIT_SECRET), never the browser.

-- every send by a signed-in paying user: the history page, the quota, and the long life it was given
create table if not exists public.sends (
  id text primary key,                 -- transfers.id
  user_id uuid not null,
  pool uuid not null,                  -- whose storage it counts against: the user, or their Business team owner
  name text,
  file_name text,
  size bigint not null default 0,
  life_min int not null default 30,
  downloads int not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz               -- null until the stored copy is saved (then now() + life)
);
alter table public.sends enable row level security;
create index if not exists sends_user on public.sends (user_id, created_at desc);
create index if not exists sends_pool on public.sends (pool, created_at desc);

-- Business: people the owner put on the team (by email, up to the seats paid for)
create table if not exists public.team_members (
  owner uuid not null references public.accounts (user_id) on delete cascade,
  email text not null,
  added_at timestamptz not null default now(),
  primary key (owner, email)
);
alter table public.team_members enable row level security;
create index if not exists team_members_email on public.team_members (lower(email));

-- downloads counted on the object also land in the history (kept after the object burns)
create or replace function private.sends_downloads() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.sends set downloads = new.downloads where id = new.id and downloads <> new.downloads;
  return new;
end $$;
drop trigger if exists sends_downloads on public.transfers;
create trigger sends_downloads after update of downloads on public.transfers
  for each row when (new.downloads is distinct from old.downloads) execute function private.sends_downloads();

/** the Business team a user belongs to (not as owner): the owner's id, if that owner's plan is live and the seat counts */
create or replace function private.team_of(p_user uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select o.user_id
    from public.accounts me
    join public.team_members m on lower(m.email) = lower(me.email)
    join public.accounts o on o.user_id = m.owner
   where me.user_id = p_user and o.user_id <> p_user and private.plan_now(o) = 'business'
     -- seats: the owner counts as one; members beyond the seats paid for (latest added first out) get nothing
     and (select count(*) from public.team_members x where x.owner = o.user_id and x.added_at <= m.added_at) <= greatest(o.seats - 1, 0)
   order by m.added_at
   limit 1
$$;

/** a signed-in user's account, now with team membership: a member of a live Business team is Business */
create or replace function public.orbit_account_get(p_secret text, p_user uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.accounts; own text; team uuid;
begin
  perform private.check(p_secret);
  insert into public.accounts (user_id, email) values (p_user, nullif(lower(p_email), ''))
  on conflict (user_id) do update set email = coalesce(excluded.email, public.accounts.email)
  returning * into a;
  own := private.plan_now(a);
  team := case when own = 'free' then private.team_of(p_user) end;
  return jsonb_build_object('plan', case when team is not null then 'business' else own end, 'paid', a.plan, 'billing', a.billing,
    'seats', a.seats, 'status', a.status, 'cancelAtEnd', a.cancel_at_end, 'periodEnd', a.period_end, 'customer', a.paddle_customer,
    'teamOwner', team, 'owner', own = 'business',
    'pool', coalesce(team, p_user));
end $$;

/** a paying user starts a send: checks the storage quota of the pool and records it for the history.
 *  Pending sends (not saved yet) count for a day so a burst of uploads can't overshoot the quota. */
create or replace function public.orbit_send_open(p_secret text, p jsonb) returns text
language plpgsql security definer set search_path = '' as $$
declare used bigint; v_pool uuid := (p->>'pool')::uuid;
begin
  perform private.check(p_secret);
  perform pg_advisory_xact_lock(hashtext(v_pool::text));
  select coalesce(sum(size), 0) into used from public.sends
   where public.sends.pool = v_pool
     and ((expires_at is not null and expires_at > now()) or (expires_at is null and created_at > now() - interval '1 day' and life_min > 30));
  if (p->>'life')::int > 30 and used + (p->>'size')::bigint > (p->>'quota')::bigint then return 'quota'; end if;
  insert into public.sends (id, user_id, pool, name, file_name, size, life_min)
  values (p->>'id', (p->>'user')::uuid, v_pool, left(p->>'name', 60), left(p->>'fileName', 180), (p->>'size')::bigint, (p->>'life')::int)
  on conflict (id) do nothing;
  return 'ok';
end $$;

/** the stored copy is saved: a long-lived send now lives `life` minutes from now (only its owner may ask) */
create or replace function public.orbit_send_live(p_secret text, p_id text, p_owner_hash text) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare s public.sends; v_until timestamptz;
begin
  perform private.check(p_secret);
  select * into s from public.sends where id = p_id;
  if s.id is null or s.life_min <= 30 then return null; end if;
  v_until := now() + make_interval(mins => least(s.life_min, 30 * 24 * 60));
  update public.transfers set expires_at = v_until
   where id = p_id and owner_hash = p_owner_hash and expires_at > now()
     and (max_downloads is null or downloads < max_downloads);
  if not found then return null; end if;
  update public.sends set expires_at = v_until where id = p_id;
  return v_until;
end $$;

/** history: the user's own sends (days back), or the whole team's for a Business owner */
create or replace function public.orbit_history(p_secret text, p_user uuid, p_days int, p_team boolean) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'fileName', s.file_name, 'size', s.size, 'life', s.life_min,
      'downloads', s.downloads, 'createdAt', s.created_at, 'expiresAt', coalesce(s.expires_at, t.expires_at), 'live', t.id is not null and t.expires_at > now(),
      'by', case when s.user_id <> p_user then (select email from public.accounts where user_id = s.user_id) end) order by s.created_at desc)
    from (select * from public.sends x
           where (case when p_team then x.pool = p_user else x.user_id = p_user end)
             and x.created_at > now() - make_interval(days => greatest(1, least(p_days, 366)))
           order by x.created_at desc limit 500) s
    left join public.transfers t on t.id = s.id), '[]'::jsonb);
end $$;

/** storage in use right now for a pool (Pro: the user; Business: the team) */
create or replace function public.orbit_pool_used(p_secret text, p_pool uuid) returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select coalesce(sum(size), 0)::bigint from public.sends
   where pool = p_pool and ((expires_at is not null and expires_at > now()) or (expires_at is null and created_at > now() - interval '1 day' and life_min > 30)));
end $$;

-- Business owner: the team
create or replace function public.orbit_team(p_secret text, p_owner uuid, p_action text, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.accounts; e text := lower(trim(coalesce(p_email, '')));
begin
  perform private.check(p_secret);
  select * into a from public.accounts where user_id = p_owner;
  if a.user_id is null or private.plan_now(a) <> 'business' then return jsonb_build_object('error', 'Business plan needed'); end if;
  if p_action = 'add' then
    if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 254 then return jsonb_build_object('error', 'Not an email address'); end if;
    if e = lower(a.email) then return jsonb_build_object('error', 'You are already on the team'); end if;
    if (select count(*) from public.team_members where owner = p_owner) >= greatest(a.seats - 1, 0) then
      return jsonb_build_object('error', 'All seats are taken: add seats in billing first'); end if;
    insert into public.team_members (owner, email) values (p_owner, e) on conflict do nothing;
  elsif p_action = 'remove' then
    delete from public.team_members where owner = p_owner and email = e;
  end if;
  return jsonb_build_object('seats', a.seats, 'members', coalesce((select jsonb_agg(jsonb_build_object('email', m.email, 'addedAt', m.added_at,
      'joined', exists (select 1 from public.accounts x where lower(x.email) = m.email)) order by m.added_at)
    from public.team_members m where m.owner = p_owner), '[]'::jsonb));
end $$;

revoke all on function private.sends_downloads(), private.team_of(uuid) from public, anon, authenticated;
revoke all on function public.orbit_send_open(text, jsonb), public.orbit_send_live(text, text, text), public.orbit_history(text, uuid, int, boolean),
  public.orbit_pool_used(text, uuid), public.orbit_team(text, uuid, text, text) from public, authenticated;
grant execute on function public.orbit_send_open(text, jsonb), public.orbit_send_live(text, text, text), public.orbit_history(text, uuid, int, boolean),
  public.orbit_pool_used(text, uuid), public.orbit_team(text, uuid, text, text) to anon;
