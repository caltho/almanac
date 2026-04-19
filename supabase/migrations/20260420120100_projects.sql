-- projects + project_items. Projects nest via parent_id. Items are generic
-- checklist/outline nodes (title + done + notes), also nestable within a
-- project via parent_item_id.

create table public.projects (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	parent_id uuid references public.projects (id) on delete cascade,
	name text not null,
	description text,
	-- Free-form status: 'active' | 'archived' | 'done' | ...
	status text not null default 'active',
	color text,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index projects_owner_parent_idx on public.projects (owner_id, parent_id, status);

create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

create policy "projects_select"
	on public.projects for select to authenticated
	using (owner_id = auth.uid() or public.can_access('projects', id, 'read'));
create policy "projects_insert_own"
	on public.projects for insert to authenticated
	with check (owner_id = auth.uid());
create policy "projects_update"
	on public.projects for update to authenticated
	using (owner_id = auth.uid() or public.can_access('projects', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('projects', id, 'write'));
create policy "projects_delete_own"
	on public.projects for delete to authenticated
	using (owner_id = auth.uid());

create table public.project_items (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	project_id uuid not null references public.projects (id) on delete cascade,
	parent_item_id uuid references public.project_items (id) on delete cascade,
	order_index integer not null default 0,
	title text not null,
	notes text,
	done_at timestamptz,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index project_items_project_order_idx
	on public.project_items (project_id, parent_item_id, order_index);

create trigger project_items_touch_updated_at
before update on public.project_items
for each row execute function public.touch_updated_at();

alter table public.project_items enable row level security;

-- Items inherit visibility from their parent project.
create policy "project_items_select"
	on public.project_items for select to authenticated
	using (
		exists (
			select 1 from public.projects p
			where p.id = project_items.project_id
				and (p.owner_id = auth.uid() or public.can_access('projects', p.id, 'read'))
		)
	);
create policy "project_items_insert"
	on public.project_items for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.projects p
			where p.id = project_items.project_id
				and (p.owner_id = auth.uid() or public.can_access('projects', p.id, 'write'))
		)
	);
create policy "project_items_update"
	on public.project_items for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.projects p
			where p.id = project_items.project_id and public.can_access('projects', p.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from public.projects p
			where p.id = project_items.project_id and public.can_access('projects', p.id, 'write')
		)
	);
create policy "project_items_delete"
	on public.project_items for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.projects p
			where p.id = project_items.project_id and public.can_access('projects', p.id, 'write')
		)
	);

-- Retrofit tasks.project_id FK (the column was added in M3 as a plain uuid).
alter table public.tasks
	add constraint tasks_project_id_fkey
	foreign key (project_id) references public.projects (id) on delete set null;
