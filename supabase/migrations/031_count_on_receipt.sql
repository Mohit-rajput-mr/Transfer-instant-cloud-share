-- A download counts only when the file has really arrived (owner 2026-10-25: "it counts as a download while it still
-- says Unlocking, nothing saved"). orbit_unlock counted at the passcode check, before a single byte moved, so a receiver
-- waiting on a sender whose phone was asleep (or who gave up) still showed up as a download.
--   orbit_unlock_check: checks the passcode (wrong tries still count toward the lock) and hands out the file's details,
--     nothing counted. Objects with a download limit keep counting here (orbit_unlock): the limit must hold even when
--     several people start at once.
--   orbit_received: the receiver's page says the file is complete; counted then (same counters, events and globe arc
--     as before). Needs the same passcode proof, so nobody can inflate a count without it.

create or replace function public.orbit_unlock_check(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers; r jsonb;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and expires_at > now();
  if t.id is null then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.max_downloads is not null then
    r := public.orbit_unlock(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo);
    return r || jsonb_build_object('counted', true);
  end if;
  if t.status not in ('ready','sealed') then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.failed >= 12 then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
  if t.auth_hash <> p_auth_hash then
    update public.transfers set failed = failed + 1 where id = p_id;
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'fail', p_device, p_label);
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'left', greatest(0, 11 - t.failed));
  end if;
  if t.status = 'sealed' then return jsonb_build_object('ok', false, 'reason', 'sealed'); end if;
  return jsonb_build_object('ok', true, 'counted', false, 'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size,
    'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $$;

create or replace function public.orbit_received(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id for update;
  if t.id is null or t.auth_hash <> p_auth_hash then return jsonb_build_object('ok', false); end if;
  -- limited objects were counted at unlock already
  if t.max_downloads is not null then return jsonb_build_object('ok', true, 'counted', false); end if;
  update public.transfers set downloads = downloads + 1 where id = p_id returning * into t;
  insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'download', p_device, p_label);
  perform private.bump('downloads', 1);
  perform private.bump('bytes_down', t.size);
  insert into public.geo_events (kind, transfer_id, bytes, label, country, city, lat, lon, from_lat, from_lon)
  values ('download', t.id, t.size, p_label, nullif(p_geo->>'country',''), nullif(p_geo->>'city',''),
          nullif(p_geo->>'lat','')::real, nullif(p_geo->>'lon','')::real, t.lat, t.lon);
  return jsonb_build_object('ok', true, 'counted', true, 'downloads', t.downloads);
end $$;

revoke all on function public.orbit_unlock_check(text, text, text, text, text, jsonb) from public, authenticated;
grant execute on function public.orbit_unlock_check(text, text, text, text, text, jsonb) to anon;
revoke all on function public.orbit_received(text, text, text, text, text, jsonb) from public, authenticated;
grant execute on function public.orbit_received(text, text, text, text, text, jsonb) to anon;
