-- sleep_logs — nightly sleep tracking.

create table public.sleep_logs (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	log_date date not null default current_date,
	-- Times-of-day; crossing midnight is implicit (went_to_bed may be > woke_up).
	went_to_bed time,
	woke_up time,
	hours_slept numeric(4, 2),
	quality smallint check (quality is null or (quality between 1 and 10)),
	notes text,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create index sleep_logs_owner_date_idx
	on public.sleep_logs (owner_id, log_date desc)
	where deleted_at is null;

create trigger sleep_logs_touch_updated_at
before update on public.sleep_logs
for each row execute function public.touch_updated_at();

alter table public.sleep_logs enable row level security;

create policy "sleep_logs_select"
	on public.sleep_logs for select to authenticated
	using (
		deleted_at is null
		and (owner_id = auth.uid() or public.can_access('sleep', id, 'read'))
	);

create policy "sleep_logs_insert_own"
	on public.sleep_logs for insert to authenticated
	with check (owner_id = auth.uid());

create policy "sleep_logs_update"
	on public.sleep_logs for update to authenticated
	using (owner_id = auth.uid() or public.can_access('sleep', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('sleep', id, 'write'));

create policy "sleep_logs_delete_owner"
	on public.sleep_logs for delete to authenticated
	using (owner_id = auth.uid());
