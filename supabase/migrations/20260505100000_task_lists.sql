-- Task lists — ephemeral grocery-style task groupings on /tasks. A list is
-- "active" while any item is unchecked and "done" when every item is
-- checked. Done lists fade to the bottom of the page but stay in the DB
-- so they can be searched later for context ("what did I pack for that
-- Sydney trip?"). Distinct from checklists, which are reusable lists you
-- clear-and-reuse (gym bag, day pack); task_lists are one-shots.

create table public.task_lists (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	color text,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index task_lists_owner_idx on public.task_lists (owner_id, created_at desc);

create trigger task_lists_touch_updated_at
before update on public.task_lists
for each row execute function public.touch_updated_at();

alter table public.task_lists enable row level security;

create policy "task_lists_select_own"
	on public.task_lists for select to authenticated
	using (owner_id = auth.uid());
create policy "task_lists_insert_own"
	on public.task_lists for insert to authenticated
	with check (owner_id = auth.uid());
create policy "task_lists_update_own"
	on public.task_lists for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "task_lists_delete_own"
	on public.task_lists for delete to authenticated
	using (owner_id = auth.uid());

create table public.task_list_items (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	list_id uuid not null references public.task_lists (id) on delete cascade,
	title text not null,
	checked boolean not null default false,
	order_index integer not null default 0,
	created_at timestamptz not null default now()
);

create index task_list_items_list_idx
	on public.task_list_items (list_id, order_index);

alter table public.task_list_items enable row level security;

create policy "task_list_items_select_own"
	on public.task_list_items for select to authenticated
	using (owner_id = auth.uid());
create policy "task_list_items_insert_own"
	on public.task_list_items for insert to authenticated
	with check (owner_id = auth.uid());
create policy "task_list_items_update_own"
	on public.task_list_items for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "task_list_items_delete_own"
	on public.task_list_items for delete to authenticated
	using (owner_id = auth.uid());
