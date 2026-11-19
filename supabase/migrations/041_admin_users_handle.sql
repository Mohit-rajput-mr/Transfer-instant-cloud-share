-- 041: HQ Users shows each account's bubble name (migration 040)
create or replace function public.orbit_admin_users(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare today timestamptz := date_trunc('day', now());
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'total', (select count(*) from auth.users),
    'newToday', (select count(*) from auth.users where created_at >= today),
    'new7', (select count(*) from auth.users where created_at >= now() - interval '7 days'),
    'new30', (select count(*) from auth.users where created_at >= now() - interval '30 days'),
    'loginsToday', (select count(*) from auth.users where last_sign_in_at >= today),
    'active7', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
    'google', (select count(*) from auth.users where raw_app_meta_data->'providers' ? 'google'),
    'email', (select count(*) from auth.users where raw_app_meta_data->'providers' ? 'email'),
    'unconfirmed', (select count(*) from auth.users where email_confirmed_at is null),
    'paying', (select count(*) from public.accounts a where private.plan_now(a) <> 'free'),
    'users', coalesce((select jsonb_agg(x order by x->>'createdAt' desc) from (
      select jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'name', coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
        'handle', (select h.handle from public.handles h where h.user_id = u.id),
        'dob', u.raw_user_meta_data->>'dob',
        'avatar', u.raw_user_meta_data->>'avatar_url',
        'providers', coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb),
        'createdAt', u.created_at,
        'lastLogin', u.last_sign_in_at,
        'confirmed', u.email_confirmed_at is not null,
        'plan', case when a.user_id is null then 'free' else private.plan_now(a) end,
        'team', private.team_of(u.id) is not null,
        'synced', a.vault_at,
        'sends', (select count(*) from public.sends s where s.user_id = u.id),
        'paid', coalesce((select sum(amount) from public.payments p where p.user_id = u.id and p.status = 'completed'), 0)
      ) as x
      from auth.users u left join public.accounts a on a.user_id = u.id
      order by u.created_at desc limit 2000) t), '[]'::jsonb));
end $$;

revoke all on function public.orbit_admin_users(text) from public, authenticated;
grant execute on function public.orbit_admin_users(text) to anon;
