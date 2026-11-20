-- 039: a user deletes their own account (/api/account/delete, right after a fresh emailed code): the Supabase Auth user
-- (with its sessions and identities), its account row, its team. Files already sent burn on their own clock.
-- (Login codes themselves are Supabase Auth's email OTP: no table here, see lib/otp.ts.)
create or replace function public.orbit_account_delete(p_secret text, p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  delete from public.team_members where owner = p_user;
  delete from public.accounts where user_id = p_user;
  delete from auth.users where id = p_user;
end $$;

revoke all on function public.orbit_account_delete(text, uuid) from public, authenticated;
grant execute on function public.orbit_account_delete(text, uuid) to anon;
