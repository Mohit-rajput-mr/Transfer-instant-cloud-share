-- 024: "Nearby" = sent from the same network (Wi-Fi / office line). The public list is per area, and two devices on one
-- Wi-Fi can sit in different areas (one placed by GPS, the other by its IP), so they missed each other. This lists
-- what is floating from the asker's own network, wherever it was pinned. Anonymous sends carry a rotating network key
-- and never match.
create or replace function public.orbit_list_net(p_secret text, p_net text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  if p_net is null or length(p_net) <> 12 then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(private.pub(t) || jsonb_build_object('watchers', 0) order by t.created_at desc)
    from (select * from public.transfers where net_hash = p_net and status in ('ready','sealed') and expires_at > now()
          order by created_at desc limit 60) t), '[]'::jsonb);
end $$;
revoke all on function public.orbit_list_net(text, text) from public, authenticated;
grant execute on function public.orbit_list_net(text, text) to anon;
