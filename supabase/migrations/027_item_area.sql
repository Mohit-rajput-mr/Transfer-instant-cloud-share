-- 027: each public-void object says which area (geohash-4, ~20-40 km) it was sent from, so the Nearby view can show
-- only your own area while Open void shows the area and the eight around it. Anonymous sends never carry a place.
create or replace function private.pub(t public.transfers) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', t.id, 'name', t.name, 'fileName', t.file_name, 'mime', t.mime, 'size', t.size,
    'salt', t.salt, 'iterations', t.iterations, 'hue', t.hue, 'status', t.status,
    'netHash', case when t.anon then null else t.net_hash end, 'maxDownloads', t.max_downloads, 'downloads', t.downloads,
    'devices', (select count(distinct e.device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'download'),
    'views', (select count(distinct e.device_id) from public.transfer_events e where e.transfer_id = t.id and e.kind = 'view'),
    'area', case when t.anon then null else t.area end,
    'createdAt', t.created_at, 'expiresAt', t.expires_at)
$$;
