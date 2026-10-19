-- 025: a private space closes 8 hours after it was made (the app treats it as gone: lib/spaces.ts getMeta). Its name
-- can be taken again: this re-opens the row for the new space, and everything of the closed one ends (members out,
-- files, notes and tasks expire at once, the reapers take them). No rows are deleted here.
create or replace function public.orbit_space_reopen(p_secret text, p_slug text, p_meta text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.spaces set meta = p_meta, created_at = now(), burnt_at = null where slug = p_slug and not anon;
  get diagnostics n = row_count;
  if n = 0 then return false; end if;
  update public.space_members set gone = true where slug = p_slug and not gone;
  update public.transfers set expires_at = now() where expires_at > now() and substring(name from '^⟪s=([^;⟫]+)') = p_slug;
  update public.bubbles set expires_at = now() where expires_at > now() and space = p_slug;
  update public.tasks set expires_at = now() where expires_at > now() and space = p_slug;
  return true;
end $$;
revoke all on function public.orbit_space_reopen(text, text, text) from public, authenticated;
grant execute on function public.orbit_space_reopen(text, text, text) to anon;
