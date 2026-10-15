-- 006: look preferences without accounts (styles). key = keyed hash (device match or style code); value = { skin }.
create table if not exists public.prefs (key text primary key, prefs jsonb, updated_at timestamptz not null default now());
alter table public.prefs enable row level security;
revoke all on public.prefs from anon, authenticated;

create or replace function public.orbit_pref_set(p_secret text, p_key text, p_prefs jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  insert into public.prefs as x (key, prefs, updated_at) values (p_key, p_prefs, now())
  on conflict (key) do update set prefs = excluded.prefs, updated_at = now();
end $$;

-- entries untouched for 180 days count as gone
create or replace function public.orbit_pref_get(p_secret text, p_key text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return (select prefs from public.prefs where key = p_key and updated_at > now() - interval '180 days');
end $$;

revoke all on function public.orbit_pref_set(text, text, jsonb), public.orbit_pref_get(text, text) from public;
grant execute on function public.orbit_pref_set(text, text, jsonb), public.orbit_pref_get(text, text) to anon;
