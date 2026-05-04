-- People CMS — promote the bare birthdays table to a richer record. Each row
-- is a person; their birthday is now an optional property (month/day/year).
-- The previous birthdays table merges into people and is dropped — every
-- existing row becomes a person with the same name + birthday metadata.
--
-- Safe because birthdays only stored what was already a person record (name,
-- date, notes, color). Adding email/phone/avatar/notes-as-richer-field opens
-- room for the CMS view at /people.

create table public.people (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	email text,
	phone text,
	notes text,
	color text,
	avatar_url text,
	birthday_month smallint check (birthday_month is null or (birthday_month between 1 and 12)),
	birthday_day smallint check (birthday_day is null or (birthday_day between 1 and 31)),
	birthday_year integer,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	-- Either both month and day are set, or neither — never half-known.
	constraint people_birthday_pair check (
		(birthday_month is null and birthday_day is null)
		or (birthday_month is not null and birthday_day is not null)
	)
);

create index people_owner_idx on public.people (owner_id, name);
create index people_birthday_idx
	on public.people (owner_id, birthday_month, birthday_day)
	where birthday_month is not null;

create trigger people_touch_updated_at
before update on public.people
for each row execute function public.touch_updated_at();

alter table public.people enable row level security;

create policy "people_select_own"
	on public.people for select to authenticated
	using (owner_id = auth.uid());
create policy "people_insert_own"
	on public.people for insert to authenticated
	with check (owner_id = auth.uid());
create policy "people_update_own"
	on public.people for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "people_delete_own"
	on public.people for delete to authenticated
	using (owner_id = auth.uid());

-- Backfill: every existing birthday becomes a person.
insert into public.people (
	owner_id, name, notes, color,
	birthday_month, birthday_day, birthday_year,
	created_at, updated_at
)
select
	owner_id, name, notes, color,
	month, day, year,
	created_at, updated_at
from public.birthdays;

drop table public.birthdays;
