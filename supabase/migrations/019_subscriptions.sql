-- 019: paid plans (Stripe). One row per Stripe subscription, written only by the webhook (/api/stripe/webhook)
-- through orbit_subscription_upsert. No card data ever reaches us: Stripe Checkout holds it.
create table if not exists public.subscriptions (
  id text primary key,                 -- Stripe subscription id (sub_…)
  customer text not null,              -- Stripe customer id (cus_…)
  email text,
  plan text not null check (plan in ('business', 'pro')),
  billing text not null check (billing in ('monthly', 'yearly')),
  seats int not null default 1,
  status text not null,                -- trialing, active, past_due, canceled, …
  cancel_at_end boolean not null default false,
  period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create index if not exists subscriptions_customer on public.subscriptions (customer);

create or replace function public.orbit_subscription_upsert(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  insert into public.subscriptions (id, customer, email, plan, billing, seats, status, cancel_at_end, period_end)
  values (p->>'id', p->>'customer', nullif(p->>'email', ''), coalesce(p->>'plan', 'business'), coalesce(p->>'billing', 'yearly'),
    greatest(1, coalesce((p->>'seats')::int, 1)), p->>'status', coalesce((p->>'cancelAtEnd')::boolean, false), nullif(p->>'periodEnd', '')::timestamptz)
  on conflict (id) do update set
    customer = excluded.customer,
    email = coalesce(excluded.email, public.subscriptions.email),
    plan = excluded.plan,
    billing = excluded.billing,
    seats = excluded.seats,
    status = excluded.status,
    cancel_at_end = excluded.cancel_at_end,
    period_end = excluded.period_end,
    updated_at = now();
end $$;

revoke all on function public.orbit_subscription_upsert(text, jsonb) from public;
grant execute on function public.orbit_subscription_upsert(text, jsonb) to anon, authenticated;
