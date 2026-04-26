-- activities — user-defined "things I do" + a log table linking them to dates.
--
-- Distinct from habits (recurring cadence + tick UI) and tasks (one-shot
-- to-do). Activities are categories you accumulate over time: "ran",
-- "cooked", "called mum". The page lets you focus a date and rapid-toggle
-- which activities happened that day.
--
-- The unique (activity_id, log_date) constraint makes toggling idempotent
-- and keeps the per-day set semantics clean.

create table public.activities (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	color text,
	order_index integer not null default 0,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index activities_owner_idx
	on public.activities (owner_id, order_index, name)
	where archived_at is null;

create trigger activities_touch_updated_at
before update on public.activities
for each row execute function public.touch_updated_at();

alter table public.activities enable row level security;

create policy "activities_select"
	on public.activities for select to authenticated
	using (
		archived_at is null
		and (owner_id = auth.uid() or public.can_access('activities', id, 'read'))
	);
create policy "activities_insert_own"
	on public.activities for insert to authenticated
	with check (owner_id = auth.uid());
create policy "activities_update"
	on public.activities for update to authenticated
	using (owner_id = auth.uid() or public.can_access('activities', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('activities', id, 'write'));
create policy "activities_delete_own"
	on public.activities for delete to authenticated
	using (owner_id = auth.uid());

create table public.activity_logs (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	activity_id uuid not null references public.activities (id) on delete cascade,
	log_date date not null,
	notes text,
	created_at timestamptz not null default now(),
	unique (activity_id, log_date)
);

create index activity_logs_date_idx
	on public.activity_logs (owner_id, log_date);

alter table public.activity_logs enable row level security;

-- Logs inherit visibility from their parent activity.
create policy "activity_logs_select"
	on public.activity_logs for select to authenticated
	using (
		exists (
			select 1 from public.activities a
			where a.id = activity_logs.activity_id
				and a.archived_at is null
				and (a.owner_id = auth.uid() or public.can_access('activities', a.id, 'read'))
		)
	);
create policy "activity_logs_insert"
	on public.activity_logs for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.activities a
			where a.id = activity_logs.activity_id
				and (a.owner_id = auth.uid() or public.can_access('activities', a.id, 'write'))
		)
	);
create policy "activity_logs_delete"
	on public.activity_logs for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.activities a
			where a.id = activity_logs.activity_id and public.can_access('activities', a.id, 'write')
		)
	);
