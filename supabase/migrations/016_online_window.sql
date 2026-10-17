-- 016: devices send their heartbeat every 90 s (was 40 s) to stay well inside the free plans, so "online" and
-- live viewers count the last 120 s (was 50 s). Applied to orbit_list2, orbit_list3 and orbit_admin_overview by
-- rewriting their bodies in place:
do $$
declare f record;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('orbit_list2', 'orbit_list3', 'orbit_admin_overview') loop
    execute replace(pg_get_functiondef(f.oid), 'interval ''50 seconds''', 'interval ''120 seconds''');
  end loop;
end $$;
