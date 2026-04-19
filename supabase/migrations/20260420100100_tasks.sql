-- tasks — flat to-do list. Gains project_id + sub-items in M5; for now a flat
-- list with status/due/priority + custom attrs.

create type public.task_status as enum ('todo', 'doing', 'done', 'cancelled');

create table public.tasks (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	description text,
	status public.task_status not null default 'todo',
	due_date date,
	completed_at timestamptz,
	priority smallint check (priority is null or (priority between 1 and 5)),
	-- project_id FK populated in M5 (projects table). Kept nullable for now.
	project_id uuid,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create index tasks_owner_status_idx
	on public.tasks (owner_id, status, due_date)
	where deleted_at is null;

create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

-- Auto-stamp completed_at when transitioning to 'done'.
create or replace function public.tasks_stamp_completed()
returns trigger language plpgsql as $$
begin
	if new.status = 'done' and (old.status is distinct from 'done') then
		new.completed_at := coalesce(new.completed_at, now());
	elsif new.status <> 'done' and old.status = 'done' then
		new.completed_at := null;
	end if;
	return new;
end;
$$;

create trigger tasks_stamp_completed_trg
before update on public.tasks
for each row execute function public.tasks_stamp_completed();

alter table public.tasks enable row level security;

create policy "tasks_select"
	on public.tasks for select to authenticated
	using (
		deleted_at is null
		and (owner_id = auth.uid() or public.can_access('tasks', id, 'read'))
	);

create policy "tasks_insert_own"
	on public.tasks for insert to authenticated
	with check (owner_id = auth.uid());

create policy "tasks_update"
	on public.tasks for update to authenticated
	using (owner_id = auth.uid() or public.can_access('tasks', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('tasks', id, 'write'));

create policy "tasks_delete_owner"
	on public.tasks for delete to authenticated
	using (owner_id = auth.uid());
