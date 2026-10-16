-- 011 (applied as task_route): a task's route. Its writer names up to 8 stages (e.g. In progress → AI reviewing →
-- Generating zip → Zip sent to email), moves the task along them and can rewrite its line. Reaching the last
-- stage ticks it done. Every move is logged (stage, who, when) so anyone watching (a boss, the team) sees it live.
alter table public.tasks add column if not exists route jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists stage int not null default -1;
alter table public.tasks add column if not exists stage_log jsonb not null default '[]'::jsonb;
alter table public.tasks add column if not exists edited_at timestamptz;
-- orbit_task_edit(p_secret, p_id, p_owner_hash, p_body, p_route, p_stage, p_by) → boolean
-- orbit_task_list now also returns route, stage, log, editedAt
-- (full bodies as applied: see the live database; kept in sync with 010_tasks.sql)

-- 011b (applied as task_order_move):
-- orbit_task_reorder(p_secret, p_id, p_owner_hash, p_dir) → boolean: the writer moves a task up/down (numbers swap)
-- orbit_task_to_space(p_secret, p_id, p_owner_hash, p_space) → boolean: going private with the team, the writer's
--   tasks move into the new space, numbered after what is there

-- 011c (applied as transfer_retag): orbit_retag(p_secret, p_id, p_owner_hash, p_name) → boolean
--   the sender rewrites their object's name tag (wiring it to a task after sending, or unwiring it)
