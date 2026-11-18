-- 034: accounts (Supabase Auth users) and paid plans sold through Paddle (merchant of record).
-- Rows are written only by the server: the Paddle webhook (/api/paddle/webhook) and the signed-in user's own
-- requests (/api/account), both through SECURITY DEFINER functions gated by ORBIT_SECRET (private.check).
-- No card data ever reaches us: Paddle Checkout holds it.

create table if not exists public.accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business')),
  billing text check (billing in ('monthly', 'yearly')),
  seats int not null default 1,
  status text not null default 'none',      -- paddle subscription status: active, trialing, past_due, paused, canceled
  cancel_at_end boolean not null default false,
  period_end timestamptz,
  paddle_customer text,
  paddle_sub text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
create index if not exists accounts_paddle_sub on public.accounts (paddle_sub);

create table if not exists public.payments (
  id text primary key,                       -- paddle transaction id (txn_…)
  user_id uuid,
  email text,
  plan text,
  billing text,
  seats int,
  amount numeric,                            -- grand total in the currency's main unit (e.g. 72.00)
  currency text,
  status text,                               -- completed, past_due, refunded …
  country text,
  paddle_sub text,
  paddle_customer text,
  created_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create index if not exists payments_created on public.payments (created_at desc);

-- the plan a user may use right now (a lapsed or cancelled subscription falls back to free)
create or replace function private.plan_now(a public.accounts) returns text
language sql stable as $$
  select case
    when a.plan in ('pro', 'business') and a.status in ('active', 'trialing', 'past_due')
      and (a.period_end is null or a.period_end > now() - interval '3 days') then a.plan
    when a.plan in ('pro', 'business') and a.status = 'canceled' and a.period_end > now() then a.plan
    else 'free' end
$$;

/** a signed-in user's account (created on first sight) */
create or replace function public.orbit_account_get(p_secret text, p_user uuid, p_email text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.accounts;
begin
  perform private.check(p_secret);
  insert into public.accounts (user_id, email) values (p_user, nullif(p_email, ''))
  on conflict (user_id) do update set email = coalesce(excluded.email, public.accounts.email)
  returning * into a;
  return jsonb_build_object('plan', private.plan_now(a), 'paid', a.plan, 'billing', a.billing, 'seats', a.seats,
    'status', a.status, 'cancelAtEnd', a.cancel_at_end, 'periodEnd', a.period_end, 'customer', a.paddle_customer);
end $$;

/** Paddle subscription event → the account (matched by our user id in custom_data, else by subscription id) */
create or replace function public.orbit_paddle_sub(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := nullif(p->>'userId', '')::uuid;
begin
  perform private.check(p_secret);
  if uid is null then
    select user_id into uid from public.accounts where paddle_sub = p->>'sub';
  end if;
  if uid is null then return; end if;
  insert into public.accounts (user_id) values (uid) on conflict (user_id) do nothing;
  update public.accounts set
    plan = coalesce(nullif(p->>'plan', ''), plan),
    billing = coalesce(nullif(p->>'billing', ''), billing),
    seats = greatest(1, coalesce((p->>'seats')::int, seats)),
    status = coalesce(nullif(p->>'status', ''), status),
    cancel_at_end = coalesce((p->>'cancelAtEnd')::boolean, cancel_at_end),
    period_end = coalesce(nullif(p->>'periodEnd', '')::timestamptz, period_end),
    paddle_customer = coalesce(nullif(p->>'customer', ''), paddle_customer),
    paddle_sub = coalesce(nullif(p->>'sub', ''), paddle_sub),
    updated_at = now()
  where user_id = uid;
end $$;

/** Paddle transaction event → one payment row (idempotent: Paddle may send it twice) */
create or replace function public.orbit_paddle_payment(p_secret text, p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := nullif(p->>'userId', '')::uuid;
begin
  perform private.check(p_secret);
  if uid is null and nullif(p->>'sub', '') is not null then
    select user_id into uid from public.accounts where paddle_sub = p->>'sub';
  end if;
  insert into public.payments (id, user_id, email, plan, billing, seats, amount, currency, status, country, paddle_sub, paddle_customer, created_at)
  values (p->>'id', uid, coalesce(nullif(p->>'email', ''), (select email from public.accounts where user_id = uid)),
    nullif(p->>'plan', ''), nullif(p->>'billing', ''), nullif(p->>'seats', '')::int, nullif(p->>'amount', '')::numeric,
    nullif(p->>'currency', ''), nullif(p->>'status', ''), nullif(p->>'country', ''), nullif(p->>'sub', ''), nullif(p->>'customer', ''),
    coalesce(nullif(p->>'at', '')::timestamptz, now()))
  on conflict (id) do update set status = excluded.status, amount = coalesce(excluded.amount, public.payments.amount),
    user_id = coalesce(excluded.user_id, public.payments.user_id), email = coalesce(excluded.email, public.payments.email);
end $$;

/** HQ: every payment and every paid account */
create or replace function public.orbit_admin_payments(p_secret text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'payments', coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (select * from public.payments order by created_at desc limit 500) x), '[]'::jsonb),
    'accounts', coalesce((select jsonb_agg(jsonb_build_object('email', a.email, 'plan', private.plan_now(a), 'paid', a.plan, 'billing', a.billing,
        'seats', a.seats, 'status', a.status, 'cancelAtEnd', a.cancel_at_end, 'periodEnd', a.period_end, 'since', a.created_at) order by a.created_at desc)
      from public.accounts a), '[]'::jsonb));
end $$;

revoke all on function private.plan_now(public.accounts) from public, anon, authenticated;
revoke all on function public.orbit_account_get(text, uuid, text), public.orbit_paddle_sub(text, jsonb),
  public.orbit_paddle_payment(text, jsonb), public.orbit_admin_payments(text) from public, authenticated;
grant execute on function public.orbit_account_get(text, uuid, text), public.orbit_paddle_sub(text, jsonb),
  public.orbit_paddle_payment(text, jsonb), public.orbit_admin_payments(text) to anon;
