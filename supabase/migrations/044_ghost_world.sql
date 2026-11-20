-- 044: Ghost World (owner 2026-11-20): one worldwide anonymous room, separate from the open void. It is an anonymous
-- space with a fixed slug (anon-0-ghost, made by the server on first use, never closes, no passcode). Ghosts see only
-- what ghosts sent there; the open void never lists it (space objects are tagged ⟪s=…⟫ and kept out of public lists).
-- Its members are only the ghosts of the last 35 minutes (an anonymous session lasts 30 at most): the roster stays
-- small, and old rows are cleared as new ghosts join.

create or replace function public.orbit_space_roster(p_secret text, p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'members', coalesce((select jsonb_agg(jsonb_build_object('dh', dh, 'handle', handle) order by joined_at)
                           from public.space_members where slug = p_slug and not gone
                            and (p_slug <> 'anon-0-ghost' or joined_at > now() - interval '35 minutes')), '[]'::jsonb),
    'kicked', coalesce((select jsonb_agg(dh) from public.space_kicked where slug = p_slug), '[]'::jsonb));
end $$;

create or replace function public.orbit_space_join(p_secret text, p_slug text, p_dh text, p_handle text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if p_slug = 'anon-0-ghost' then
    delete from public.space_members where slug = p_slug and joined_at < now() - interval '1 day';
  end if;
  insert into public.space_members (slug, dh, handle) values (p_slug, p_dh, p_handle)
  on conflict (slug, dh) do update set handle = excluded.handle, gone = false,
    joined_at = case when p_slug = 'anon-0-ghost' then now() else public.space_members.joined_at end;
end $$;
