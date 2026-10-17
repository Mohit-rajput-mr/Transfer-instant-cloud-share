-- 015: the Earth view. How much is live in each area of the public void (files, bubbles, tasks), worldwide.
-- Areas only (a ~39 x 20 km cell), never anything inside a space. Small however many people use Orbit: one row
-- per area with something in it.
create or replace function public.orbit_world(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return coalesce((select jsonb_agg(jsonb_build_object('a', area, 'f', f, 'b', b, 't', t)) from (
    select area, sum(f)::int f, sum(b)::int b, sum(t)::int t from (
      select area, 1 f, 0 b, 0 t from public.transfers
        where area is not null and status in ('ready','sealed') and expires_at > now()
          and name not like '⟪s=%' and name !~ '^⟪[a-z0-9-]{1,32}\|'
      union all
      select area, 0, 1, 0 from public.bubbles where area is not null and space is null and expires_at > now()
      union all
      select area, 0, 0, 1 from public.tasks where area is not null and space is null and expires_at > now()
    ) x group by area order by count(*) desc limit 20000
  ) y), '[]'::jsonb);
end $$;
revoke all on function public.orbit_world(text) from public;
grant execute on function public.orbit_world(text) to anon;
