-- 009: a sender can add more to a bubble (the new part is marked) or rewrite it (marked edited).
alter table public.bubbles add column if not exists added_at int;          -- body length before the latest addition
alter table public.bubbles add column if not exists edited_at timestamptz;
alter table public.bubbles add column if not exists updated_at timestamptz;

create or replace function public.orbit_bubble_edit(p_secret text, p_id text, p_owner_hash text, p_body text, p_append boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  if p_append then
    update public.bubbles set added_at = length(body), body = left(body || E'\n' || p_body, 2000), updated_at = now()
     where id = p_id and owner_hash = p_owner_hash and expires_at > now();
  else
    update public.bubbles set body = left(p_body, 2000), added_at = null, edited_at = now(), updated_at = now()
     where id = p_id and owner_hash = p_owner_hash and expires_at > now();
  end if;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function public.orbit_bubble_list(p_secret text, p_space text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('id', id, 'text', body, 'by', by, 'from', from_key, 'hue', hue,
      'createdAt', created_at, 'expiresAt', expires_at, 'added', added_at, 'editedAt', edited_at, 'updatedAt', updated_at) order by created_at desc)
    from (select * from public.bubbles where expires_at > now() and coalesce(space, '') = coalesce(p_space, '')
          order by created_at desc limit 500) x), '[]'::jsonb);
end $$;

revoke all on function public.orbit_bubble_edit(text, text, text, text, boolean) from public;
grant execute on function public.orbit_bubble_edit(text, text, text, text, boolean) to anon;
