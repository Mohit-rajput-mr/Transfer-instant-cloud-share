-- 013 (applied as wired_files_live_with_task + task_carries_files): a file wired to a task lives as long as
-- the task (a 30-minute file on an 8-hour task no longer vanishes while the team is still on it).
create or replace function private.keep_with_task() returns trigger
language plpgsql security definer set search_path to '' as $$
declare tid text; te timestamptz;
begin
  tid := substring(new.name from 'w=(t[a-z0-9]{9})');
  if tid is not null then
    select expires_at into te from public.tasks where id = tid and expires_at > now();
    if te is not null and te > new.expires_at then new.expires_at := te; end if;
  end if;
  return new;
end $$;
create trigger transfers_keep_with_task before insert or update on public.transfers
  for each row execute function private.keep_with_task();

create or replace function private.task_carries_files() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if new.expires_at > old.expires_at then
    update public.transfers set expires_at = new.expires_at
     where name like '%w=' || new.id || '%' and expires_at > now() and expires_at < new.expires_at;
  end if;
  return new;
end $$;
create trigger tasks_carry_files after update of expires_at on public.tasks
  for each row execute function private.task_carries_files();

-- 013b (applied): orbit_task_edit — moving a task to any stage before the last makes it open again
-- (done_at/done_by cleared); reaching the last stage still ticks it done. Tasks stuck "done" mid-route were reopened.

-- 013c (applied): orbit_task_edit auto-ticks done only on reaching the last step when it is the third step or
-- later (a one- or two-step route stays orange/blue until its writer taps it done); any stage move clears done.
