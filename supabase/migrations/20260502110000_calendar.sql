-- Calendar — two adjacent surfaces:
--   events: one-shot dated things (no recurrence v1). all_day flips the
--     UI between a date-only and date+time presentation; storage is always
--     timestamptz so we don't have to special-case the query.
--   birthdays: month/day required, year optional (so you can record a
--     friend's birthday without knowing what year they were born).

create table public.events (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	description text,
	start_at timestamptz not null,
	end_at timestamptz,
	all_day boolean not null default false,
	location text,
	color text,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index events_owner_start_idx
	on public.events (owner_id, start_at);

create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

alter table public.events enable row level security;

create policy "events_select_own"
	on public.events for select to authenticated
	using (owner_id = auth.uid());
create policy "events_insert_own"
	on public.events for insert to authenticated
	with check (owner_id = auth.uid());
create policy "events_update_own"
	on public.events for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "events_delete_own"
	on public.events for delete to authenticated
	using (owner_id = auth.uid());

create table public.birthdays (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	month smallint not null check (month between 1 and 12),
	day smallint not null check (day between 1 and 31),
	year integer,
	notes text,
	color text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index birthdays_owner_idx
	on public.birthdays (owner_id, month, day);

create trigger birthdays_touch_updated_at
before update on public.birthdays
for each row execute function public.touch_updated_at();

alter table public.birthdays enable row level security;

create policy "birthdays_select_own"
	on public.birthdays for select to authenticated
	using (owner_id = auth.uid());
create policy "birthdays_insert_own"
	on public.birthdays for insert to authenticated
	with check (owner_id = auth.uid());
create policy "birthdays_update_own"
	on public.birthdays for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "birthdays_delete_own"
	on public.birthdays for delete to authenticated
	using (owner_id = auth.uid());
