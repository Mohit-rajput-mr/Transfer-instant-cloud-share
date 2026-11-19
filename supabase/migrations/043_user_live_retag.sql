-- 043: an account changes how its floating objects read without their owner keys (owner 2026-11-19: hiding the name
-- must hide it on what is already floating). The server lists the account's live objects (from public.sends) and
-- writes their re-tagged names (lib/spaces.ts retagName); only objects recorded as this account's are touched.
create or replace function public.orbit_user_live(p_secret text, p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'expiresAt', t.expires_at))
    from public.transfers t where t.expires_at > now() and t.id in (select s.id from public.sends s where s.user_id = p_user)), '[]'::jsonb);
end $$;

create or replace function public.orbit_user_retag(p_secret text, p_user uuid, p_id text, p_name text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  update public.transfers set name = p_name
   where id = p_id and expires_at > now() and id in (select s.id from public.sends s where s.user_id = p_user);
  return found;
end $$;

revoke all on function public.orbit_user_live(text, uuid), public.orbit_user_retag(text, uuid, text, text) from public, authenticated;
grant execute on function public.orbit_user_live(text, uuid), public.orbit_user_retag(text, uuid, text, text) to anon;
