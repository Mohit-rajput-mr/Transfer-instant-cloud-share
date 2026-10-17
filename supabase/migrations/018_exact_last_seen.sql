-- 018: the admin also keeps each device's MOST RECENT exact spot after it goes offline (the live 'exact' list is
-- online-only). 'exactSeen' is every device that ever shared GPS, at its last exact position, with when it was seen.
do $$
declare f record;
begin
  for f in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname = 'orbit_admin_overview' loop
    if position('''exactSeen''' in pg_get_functiondef(f.oid)) = 0 then
      execute replace(pg_get_functiondef(f.oid), '''exact'', coalesce((select jsonb_agg(',
        '''exactSeen'', coalesce((select jsonb_agg(jsonb_build_object(''lat'', lat, ''lon'', lon, ''acc'', acc, ''label'', label,
            ''city'', city, ''cc'', country, ''at'', loc_at, ''online'', last_seen > now() - interval ''120 seconds'') order by loc_at desc) from (
            select lat, lon, acc, label, city, country, loc_at, last_seen from public.sessions
            where precise and lat is not null and loc_at > now() - interval ''30 days'' limit 5000) x), ''[]''::jsonb),
    ''exact'', coalesce((select jsonb_agg(');
    end if;
  end loop;
end $$;
