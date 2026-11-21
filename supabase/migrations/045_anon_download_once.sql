-- 045 (owner 2026-11-21): anonymous objects only.
--  1. One device counts once: a device that already downloaded an anonymous object downloads it again without a second
--     count (unlimited and limited alike). The device id is the per-object anonymous one the site hashes
--     (lib/server.ts anonEventId of a per-object device key), so nothing links it to other objects.
--  2. A download limit burns the object the moment the last allowed device has the whole file: the row goes here, the
--     site deletes the stored copy and the downloader's screen tells every screen in the space at once (no reload).
--     Devices that were let in but never finish leave it sealed; it then burns at the 10-minute cap as before.
-- Named objects keep the old functions unchanged.

create or replace function public.orbit_unlock_check2(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb, p_once boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers; seen boolean;
begin
  perform private.check(p_secret);
  if not coalesce(p_once, false) then
    return public.orbit_unlock_check(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo);
  end if;
  select * into t from public.transfers where id = p_id and expires_at > now();
  if t.id is null then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  seen := exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'download' and device_id = p_device);
  -- a limited object, new device: counted now (strict limit; sealed when it is reached). "tell": say when it is complete
  if t.max_downloads is not null and not seen then
    return public.orbit_unlock(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo) || jsonb_build_object('counted', true, 'tell', true);
  end if;
  if t.status not in ('ready','sealed') then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.failed >= 12 then return jsonb_build_object('ok', false, 'reason', 'locked'); end if;
  if t.auth_hash <> p_auth_hash then
    update public.transfers set failed = failed + 1 where id = p_id;
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'fail', p_device, p_label);
    return jsonb_build_object('ok', false, 'reason', 'wrong', 'left', greatest(0, 11 - t.failed));
  end if;
  -- (a device already counted may fetch it again while it lives, sealed or not)
  if t.status = 'sealed' and not seen then return jsonb_build_object('ok', false, 'reason', 'sealed'); end if;
  return jsonb_build_object('ok', true, 'counted', t.max_downloads is not null, 'again', seen, 'tell', true,
    'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size, 'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $$;

create or replace function public.orbit_received2(p_secret text, p_id text, p_auth_hash text, p_device text, p_label text, p_geo jsonb, p_ms integer, p_once boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers; n int;
begin
  perform private.check(p_secret);
  if not coalesce(p_once, false) then
    return public.orbit_received(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo, p_ms);
  end if;
  select * into t from public.transfers where id = p_id for update;
  if t.id is null or t.auth_hash <> p_auth_hash then return jsonb_build_object('ok', false); end if;
  if t.max_downloads is null then
    if exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'download' and device_id = p_device) then
      return jsonb_build_object('ok', true, 'counted', false, 'again', true);
    end if;
    return public.orbit_received(p_secret, p_id, p_auth_hash, p_device, p_label, p_geo, p_ms);
  end if;
  -- limited: counted at unlock (only a device counted there can say it has the whole file)
  if not exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'download' and device_id = p_device) then
    return jsonb_build_object('ok', true, 'counted', false);
  end if;
  if not exists (select 1 from public.transfer_events where transfer_id = p_id and kind = 'got' and device_id = p_device) then
    insert into public.transfer_events (transfer_id, kind, device_id, device_label) values (p_id, 'got', p_device, p_label);
  end if;
  select count(distinct device_id) into n from public.transfer_events where transfer_id = p_id and kind = 'got';
  if n >= t.max_downloads then
    delete from public.transfers where id = p_id returning * into t;
    return jsonb_build_object('ok', true, 'counted', false, 'burned', true, 'url', coalesce(t.blob_url, t.blob_pathname));
  end if;
  return jsonb_build_object('ok', true, 'counted', false);
end $$;

revoke all on function public.orbit_unlock_check2(text, text, text, text, text, jsonb, boolean) from public, authenticated;
grant execute on function public.orbit_unlock_check2(text, text, text, text, text, jsonb, boolean) to anon;
revoke all on function public.orbit_received2(text, text, text, text, text, jsonb, integer, boolean) from public, authenticated;
grant execute on function public.orbit_received2(text, text, text, text, text, jsonb, integer, boolean) to anon;
