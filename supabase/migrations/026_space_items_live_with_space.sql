-- 026: what is posted inside a named space (file, note, task) lives as long as the space: up to its 8-hour close
-- (lib/spaces.ts closesAt), instead of the usual 15-30 minutes. Only items that belong to that space; never longer
-- than 8 hours from now. No rows are deleted.
create or replace function public.orbit_space_extend(p_secret text, p_slug text, p_kind text, p_id text, p_until timestamptz) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int; v_until timestamptz := least(p_until, now() + interval '8 hours');
begin
  perform private.check(p_secret);
  if v_until <= now() then return false; end if;
  if p_kind = 'o' then
    update public.transfers set expires_at = v_until where id = p_id and substring(name from '^⟪s=([^;⟫]+)') = p_slug and expires_at > now();
  elsif p_kind = 'b' then
    update public.bubbles set expires_at = v_until where id = p_id and space = p_slug and expires_at > now();
  elsif p_kind = 't' then
    update public.tasks set expires_at = v_until where id = p_id and space = p_slug and expires_at > now();
  else
    return false;
  end if;
  get diagnostics n = row_count;
  return n = 1;
end $$;
revoke all on function public.orbit_space_extend(text, text, text, text, timestamptz) from public, authenticated;
grant execute on function public.orbit_space_extend(text, text, text, text, timestamptz) to anon;
