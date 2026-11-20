-- 042: changing a bubble name renames what that account still has floating (owner 2026-11-19: "the old ball still
-- shows the old name"). Sends are recorded for every logged-in sender (public.sends, Free too); the name tag b= of their
-- live objects that carry the account mark (v=1) is rewritten to the new name.
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
  update public.transfers t
     set name = regexp_replace(t.name, '^(⟪(?:[^⟫]*;)?)b=[^;⟫]*', '\1b=' || h)
   where t.id in (select s.id from public.sends s where s.user_id = p_user)
     and t.expires_at > now()
     and t.name ~ '^⟪[^⟫]*v=1';
  return 'ok';
exception when unique_violation then return 'taken';
end $$;
