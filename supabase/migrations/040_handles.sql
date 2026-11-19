-- 040: bubble names — one unique name per account (like "mohit123"), the only name its files, notes and tasks carry.
-- Profile names repeat (many people are called Mohit); bubble names never do. Lower case a-z 0-9 . _ , 3 to 20 long.
create table if not exists public.handles (
  handle text primary key check (handle ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.handles enable row level security;

create or replace function private.handle_free(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' and p !~ '\.\.|__|\._|_\.'
    and p not in ('admin','administrator','orbi','orbit','orbitransfer','support','help','root','system','official','staff','team','null','undefined','anonymous','anon','void','hq','owner','moderator','security','billing','paddle','api','www','mail')
    and not exists (select 1 from public.handles h where h.handle = p)
$$;

/** is it free? plus up to 3 free ones built from the wanted name and the person's name/email (Gmail-style) */
create or replace function public.orbit_handle_check(p_secret text, p_want text, p_seeds text[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare w text := lower(trim(coalesce(p_want, ''))); out text[] := '{}'; c text; s text; n int;
begin
  perform private.check(p_secret);
  foreach s in array (array[w] || coalesce(p_seeds, '{}')) loop
    s := regexp_replace(lower(coalesce(s, '')), '[^a-z0-9._]', '', 'g');
    s := regexp_replace(s, '^[._]+|[._]+$', '', 'g');
    if length(s) < 3 then continue; end if;
    s := left(s, 16);
    foreach c in array array[s, s || '.' || to_char(now(), 'YY'), s || (10 + floor(random() * 90))::int, s || '_' || (100 + floor(random() * 900))::int, s || (1000 + floor(random() * 9000))::int] loop
      if c <> w and private.handle_free(c) and not c = any(out) then out := out || c; end if;
      exit when array_length(out, 1) >= 3;
    end loop;
    exit when array_length(out, 1) >= 3;
  end loop;
  n := 0;
  while coalesce(array_length(out, 1), 0) < 3 and n < 20 loop
    c := 'orbi' || (10000 + floor(random() * 90000))::int;
    if private.handle_free(c) and not c = any(out) then out := out || c; end if;
    n := n + 1;
  end loop;
  return jsonb_build_object('handle', w, 'available', private.handle_free(w), 'suggestions', to_jsonb(out));
end $$;

/** take a bubble name (or change it: the old one is freed). 'ok', 'taken' or 'invalid' */
create or replace function public.orbit_handle_claim(p_secret text, p_user uuid, p_handle text) returns text
language plpgsql security definer set search_path = '' as $$
declare h text := lower(trim(coalesce(p_handle, '')));
begin
  perform private.check(p_secret);
  if exists (select 1 from public.handles where user_id = p_user and handle = h) then return 'ok'; end if;
  if h !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' or h ~ '\.\.|__|\._|_\.' then return 'invalid'; end if;
  if not private.handle_free(h) then return 'taken'; end if;
  update public.handles set handle = h, created_at = now() where user_id = p_user;
  if not found then insert into public.handles (handle, user_id) values (h, p_user); end if;
  return 'ok';
exception when unique_violation then return 'taken';
end $$;

-- the account answer carries the bubble name (uploads are signed with it on the server)
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
    'teamOwner', team, 'owner', own = 'business', 'pool', coalesce(team, p_user),
    'handle', (select handle from public.handles where user_id = p_user));
end $$;

revoke all on function private.handle_free(text) from public, anon, authenticated;
revoke all on function public.orbit_handle_check(text, text, text[]), public.orbit_handle_claim(text, uuid, text) from public, authenticated;
grant execute on function public.orbit_handle_check(text, text, text[]), public.orbit_handle_claim(text, uuid, text) to anon;
