-- habits + habit_checks — streak-style habit tracking.
-- One habit_checks row per (habit, date) marks a tick. Streaks are computed
-- in the app over consecutive date rows.

create table public.habits (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	description text,
	-- Free-form cadence label; 'daily' | 'weekly' | 'weekdays' | ad-hoc text.
	cadence text not null default 'daily',
	archived_at timestamptz,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index habits_owner_active_idx
	on public.habits (owner_id)
	where archived_at is null;

create trigger habits_touch_updated_at
before update on public.habits
for each row execute function public.touch_updated_at();

create table public.habit_checks (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	habit_id uuid not null references public.habits (id) on delete cascade,
	check_date date not null default current_date,
	created_at timestamptz not null default now(),
	constraint habit_checks_unique unique (habit_id, check_date)
);

create index habit_checks_owner_date_idx on public.habit_checks (owner_id, check_date desc);
create index habit_checks_habit_date_idx on public.habit_checks (habit_id, check_date desc);

alter table public.habits enable row level security;
alter table public.habit_checks enable row level security;

-- habits
create policy "habits_select"
	on public.habits for select to authenticated
	using (owner_id = auth.uid() or public.can_access('habits', id, 'read'));

create policy "habits_insert_own"
	on public.habits for insert to authenticated
	with check (owner_id = auth.uid());

create policy "habits_update"
	on public.habits for update to authenticated
	using (owner_id = auth.uid() or public.can_access('habits', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('habits', id, 'write'));

create policy "habits_delete_owner"
	on public.habits for delete to authenticated
	using (owner_id = auth.uid());

-- habit_checks inherit visibility from their parent habit.
create policy "habit_checks_select"
	on public.habit_checks for select to authenticated
	using (
		exists (
			select 1 from public.habits h
			where h.id = habit_checks.habit_id
				and (h.owner_id = auth.uid() or public.can_access('habits', h.id, 'read'))
		)
	);

create policy "habit_checks_insert_own"
	on public.habit_checks for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.habits h
			where h.id = habit_checks.habit_id
				and (h.owner_id = auth.uid() or public.can_access('habits', h.id, 'write'))
		)
	);

create policy "habit_checks_delete"
	on public.habit_checks for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.habits h
			where h.id = habit_checks.habit_id and public.can_access('habits', h.id, 'write')
		)
	);
