-- 008: big files (up to 20 GB) with uploads that resume.
-- While the encrypted copy is still uploading, the sender's page keeps its object alive (a heartbeat);
-- once the copy is saved the lifetime starts counting from then, so a long upload doesn't eat the life
-- the sender picked. Never longer than 6 hours from launch.

create or replace function public.orbit_upload_alive(p_secret text, p_id text, p_owner_hash text, p_minutes int, p_done boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  perform private.check(p_secret);
  update public.transfers t
     set expires_at = least(t.created_at + interval '6 hours',
                            case when p_done then now() + make_interval(mins => least(greatest(p_minutes, 1), 60))
                                 else greatest(t.expires_at, now() + make_interval(mins => least(greatest(p_minutes, 1), 60))) end)
   where t.id = p_id and t.owner_hash = p_owner_hash and t.expires_at > now()
     and (t.max_downloads is null or t.downloads < t.max_downloads);
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- Free-tier guard: bytes saved this month and bytes alive right now (R2 bills GB-months of storage).
create or replace function public.orbit_cloud_budget(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'month', coalesce((select sum(bytes) from public.cloud_daily where day >= date_trunc('month', now())::date), 0),
    'live', coalesce((select sum(size) from public.transfers where expires_at > now()), 0));
end $$;

revoke execute on function public.orbit_upload_alive(text, text, text, int, boolean), public.orbit_cloud_budget(text) from public, authenticated;
grant execute on function public.orbit_upload_alive(text, text, text, int, boolean), public.orbit_cloud_budget(text) to anon;
