-- People extensions:
--  - tags text[] for free-form grouping (family / friends / work / etc).
--    Indexed via GIN so tag filters stay cheap as the directory grows.
--  - last_contacted_at for the "due to catch up" view. Nullable — null
--    means "never recorded".
--  - event_people junction table to link calendar events to people. Many-
--    to-many because one lunch can involve several people, and one person
--    appears across many events. owner_id duplicated on the junction so
--    RLS doesn't have to JOIN through events to evaluate.

alter table public.people
	add column tags text[] not null default '{}',
	add column last_contacted_at timestamptz;

create index people_tags_idx on public.people using gin (tags);
create index people_last_contacted_idx
	on public.people (owner_id, last_contacted_at nulls first);

create table public.event_people (
	event_id uuid not null references public.events (id) on delete cascade,
	person_id uuid not null references public.people (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	created_at timestamptz not null default now(),
	primary key (event_id, person_id)
);

create index event_people_owner_idx on public.event_people (owner_id);
create index event_people_person_idx on public.event_people (person_id);

alter table public.event_people enable row level security;

create policy "event_people_select_own"
	on public.event_people for select to authenticated
	using (owner_id = auth.uid());
create policy "event_people_insert_own"
	on public.event_people for insert to authenticated
	with check (owner_id = auth.uid());
create policy "event_people_delete_own"
	on public.event_people for delete to authenticated
	using (owner_id = auth.uid());
-- No update policy: to change a link, delete + insert.
