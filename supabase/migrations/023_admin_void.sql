-- HQ "Void": everything alive in every area (files, tasks, notes), and the power to burn any of it.
create or replace function public.orbit_admin_void(p_secret text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.check(p_secret);
  return jsonb_build_object(
    'now', now(),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'fileName', file_name, 'mime', mime, 'size', size,
        'status', status, 'hue', hue, 'area', area, 'anon', anon, 'country', country, 'city', city, 'downloads', downloads,
        'createdAt', created_at, 'expiresAt', expires_at) order by created_at desc)
      from (select * from public.transfers where expires_at > now() and status <> 'deleted' order by created_at desc limit 500) x), '[]'::jsonb),
    'tasks', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'num', num, 'text', body, 'by', by, 'space', space, 'area', area,
        'assignee', assignee, 'stage', stage, 'route', route, 'doneAt', done_at, 'createdAt', created_at, 'expiresAt', expires_at) order by created_at desc)
      from (select * from public.tasks where expires_at > now() order by created_at desc limit 500) x), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'text', body, 'by', by, 'space', space, 'area', area, 'hue', hue,
        'createdAt', created_at, 'expiresAt', expires_at) order by created_at desc)
      from (select * from public.bubbles where expires_at > now() order by created_at desc limit 500) x), '[]'::jsonb));
end $$;

-- burn a task or a note now (files go through orbit_admin_destroy, which also returns the blob to delete)
create or replace function public.orbit_admin_burn(p_secret text, p_kind text, p_id text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int := 0;
begin
  perform private.check(p_secret);
  if p_kind = 'task' then update public.tasks set expires_at = now() where id = p_id and expires_at > now();
  elsif p_kind = 'note' then update public.bubbles set expires_at = now() where id = p_id and expires_at > now();
  else return false; end if;
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.orbit_admin_void(text), public.orbit_admin_burn(text, text, text) from public, authenticated;
grant execute on function public.orbit_admin_void(text), public.orbit_admin_burn(text, text, text) to anon;
