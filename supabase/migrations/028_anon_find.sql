-- 028: anonymous spaces with a name and a passcode. The name is the 4 characters after "anon-" in the slug (the same
-- code a knock uses); this lists the live anonymous spaces that carry it, newest first, so a browser can try the
-- passcode on them (the join route checks it, with its wrong-passcode limits). Nothing else about a space is returned.
create or replace function public.orbit_anon_find(p_secret text, p_name text) returns text[]
language plpgsql security definer set search_path = '' stable as $$
begin
  perform private.check(p_secret);
  if p_name !~ '^[a-z0-9]{4}$' then return '{}'; end if;
  return coalesce((select array_agg(slug order by created_at desc) from (
    select s.slug, s.created_at from public.spaces s
    where s.anon and s.burnt_at is null and s.created_at > now() - interval '7 days'
      and substring(s.slug from 6 for 4) = p_name
    order by s.created_at desc limit 5) t), '{}');
end $$;
revoke all on function public.orbit_anon_find(text, text) from public, authenticated;
grant execute on function public.orbit_anon_find(text, text) to anon;
