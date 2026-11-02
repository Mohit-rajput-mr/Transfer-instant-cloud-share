-- HQ preview (owner 2026-11-02): the admin can look inside any object from HQ → Objects.
-- Files are encrypted in the sender's browser; a passcode object's key comes from its passcode, which the server
-- never has. So the admin types the passcode (open objects use the well-known code, no typing). This function:
--   p_auth_hash null  → what the browser needs to work out the key (salt, iterations, name tag: open / anonymous)
--   p_auth_hash given → checks it and hands out the file's details.
-- Nothing is counted (no download, no view, no event) and a wrong passcode never adds to `failed`, so admin tries
-- can't lock an object for its real receivers. Download limits don't apply (the admin isn't a receiver).
-- Gated by ORBIT_SECRET like every function, and the API route only calls it for a signed-in admin.

create or replace function public.orbit_admin_peek(p_secret text, p_id text, p_auth_hash text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and expires_at > now();
  if t.id is null then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.status not in ('ready','sealed') then return jsonb_build_object('ok', false, 'reason', 'uploading'); end if;
  if p_auth_hash is null then
    return jsonb_build_object('ok', true, 'name', t.name, 'salt', t.salt, 'iterations', t.iterations, 'expiresAt', t.expires_at);
  end if;
  if t.auth_hash <> p_auth_hash then return jsonb_build_object('ok', false, 'reason', 'wrong'); end if;
  return jsonb_build_object('ok', true, 'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size,
    'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $$;
revoke all on function public.orbit_admin_peek(text, text, text) from public, authenticated;
grant execute on function public.orbit_admin_peek(text, text, text) to anon;
