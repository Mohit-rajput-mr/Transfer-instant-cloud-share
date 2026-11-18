-- 037: the account vault — what a browser used to keep only for itself (owner keys of what it sent, its notes, tasks,
-- spaces, trash, name) kept with the account, so every device the user logs in on can see and manage the same things.
-- Sealed by the server (AES-256-GCM, a key per user derived from ORBIT_SECRET) before it is stored: the database
-- never holds it in the clear. Anonymous spaces are never put in it (lib/vault.ts).
alter table public.accounts add column if not exists vault text;
alter table public.accounts add column if not exists vault_at timestamptz;

create or replace function public.orbit_vault_get(p_secret text, p_user uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select vault from public.accounts where user_id = p_user);
end $$;

create or replace function public.orbit_vault_put(p_secret text, p_user uuid, p_vault text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if length(p_vault) > 1048576 then raise exception 'vault too big'; end if;
  update public.accounts set vault = p_vault, vault_at = now() where user_id = p_user;
end $$;

revoke all on function public.orbit_vault_get(text, uuid), public.orbit_vault_put(text, uuid, text) from public, authenticated;
grant execute on function public.orbit_vault_get(text, uuid), public.orbit_vault_put(text, uuid, text) to anon;
