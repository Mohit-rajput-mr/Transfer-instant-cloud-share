-- 039: a user deletes their own account (/api/account/delete, after a fresh email code), and the login codes:
-- every login (password or Google) is finished by a 6-digit code emailed to the account (lib/otp.ts). A code is bound
-- to one Supabase session (its session_id): the server treats a session as logged in only once its code was entered.
create table if not exists private.login_codes (
  session_id uuid primary key,
  user_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  tries int not null default 0,
  sent_at timestamptz not null default now(),
  sends int not null default 1,
  verified_at timestamptz
);
create index if not exists login_codes_user on private.login_codes (user_id);

/** a new code for this session (null: asked too often) — the caller emails it */
create or replace function public.orbit_otp_issue(p_secret text, p_session uuid, p_user uuid, p_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare c private.login_codes;
begin
  perform private.check(p_secret);
  select * into c from private.login_codes where session_id = p_session;
  if c.session_id is not null then
    if c.sent_at > now() - interval '30 seconds' or (c.sends >= 5 and c.sent_at > now() - interval '1 hour') then return false; end if;
    update private.login_codes set code_hash = p_hash, expires_at = now() + interval '10 minutes', tries = 0, sent_at = now(),
      sends = case when c.sent_at < now() - interval '1 hour' then 1 else c.sends + 1 end
     where session_id = p_session;
  else
    insert into private.login_codes (session_id, user_id, code_hash, expires_at) values (p_session, p_user, p_hash, now() + interval '10 minutes');
  end if;
  delete from private.login_codes where expires_at < now() - interval '30 days';
  return true;
end $$;

/** check a code: 'ok', 'wrong', 'expired' or 'locked' (5 wrong tries) */
create or replace function public.orbit_otp_check(p_secret text, p_session uuid, p_user uuid, p_hash text) returns text
language plpgsql security definer set search_path = '' as $$
declare c private.login_codes;
begin
  perform private.check(p_secret);
  select * into c from private.login_codes where session_id = p_session and user_id = p_user for update;
  if c.session_id is null or c.expires_at < now() then return 'expired'; end if;
  if c.tries >= 5 then return 'locked'; end if;
  if c.code_hash <> p_hash then
    update private.login_codes set tries = tries + 1 where session_id = p_session;
    return 'wrong';
  end if;
  update private.login_codes set verified_at = now(), code_hash = '-', expires_at = now() + interval '30 days' where session_id = p_session;
  return 'ok';
end $$;

/** when this session entered its code (null: not yet) */
create or replace function public.orbit_otp_state(p_secret text, p_session uuid, p_user uuid) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select verified_at from private.login_codes where session_id = p_session and user_id = p_user);
end $$;

/** the user's own account, gone: Supabase Auth user (sessions, identities), account, team, vault */
create or replace function public.orbit_account_delete(p_secret text, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  delete from public.team_members where owner = p_user;
  delete from public.accounts where user_id = p_user;
  delete from private.login_codes where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public.orbit_otp_issue(text, uuid, uuid, text), public.orbit_otp_check(text, uuid, uuid, text),
  public.orbit_otp_state(text, uuid, uuid), public.orbit_account_delete(text, uuid) from public, authenticated;
grant execute on function public.orbit_otp_issue(text, uuid, uuid, text), public.orbit_otp_check(text, uuid, uuid, text),
  public.orbit_otp_state(text, uuid, uuid), public.orbit_account_delete(text, uuid) to anon;
