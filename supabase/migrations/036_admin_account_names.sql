-- 036: HQ Accounts shows each user's profile name (Supabase Auth user metadata: name, or Google's full_name)
create or replace function public.orbit_admin_payments(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'payments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.payments order by created_at desc limit 500) x), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('email', a.email,
        'name', coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name'),
        'plan', private.plan_now(a), 'paid', a.plan, 'billing', a.billing,
        'seats', a.seats, 'status', a.status, 'cancelAtEnd', a.cancel_at_end, 'periodEnd', a.period_end, 'since', a.created_at) order by a.created_at desc)
      from public.accounts a left join auth.users u on u.id = a.user_id), '[]'::jsonb));
end $$;
