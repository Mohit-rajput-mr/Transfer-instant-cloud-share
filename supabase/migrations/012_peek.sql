-- Preview without downloading: the same answer as orbit_unlock (where the ciphertext is, its nonce),
-- but nothing is counted. Only for objects without a download limit (a limit must never be bypassed);
-- the API additionally allows it only for no-password objects.
create or replace function public.orbit_peek(p_secret text, p_id text, p_auth_hash text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare t public.transfers;
begin
  perform private.check(p_secret);
  select * into t from public.transfers where id = p_id and expires_at > now();
  if t.id is null or t.status <> 'ready' then return jsonb_build_object('ok', false, 'reason', 'gone'); end if;
  if t.max_downloads is not null then return jsonb_build_object('ok', false, 'reason', 'limited'); end if;
  if t.auth_hash <> p_auth_hash then return jsonb_build_object('ok', false, 'reason', 'wrong'); end if;
  return jsonb_build_object('ok', true, 'url', t.blob_url, 'nonce', t.nonce, 'chunkSize', t.chunk_size,
    'fileName', t.file_name, 'mime', t.mime, 'size', t.size);
end $function$;
revoke all on function public.orbit_peek(text, text, text) from public, authenticated;
grant execute on function public.orbit_peek(text, text, text) to anon;
