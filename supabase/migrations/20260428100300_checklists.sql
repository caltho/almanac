-- Checklists — dead-simple "things I take with me" lists. Click items to
-- check, button to clear all checks. No fields, no fuss. Lives under
-- /tasks/checklists.

create table public.checklists (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index checklists_owner_idx
	on public.checklists (owner_id, name)
	where archived_at is null;

create trigger checklists_touch_updated_at
before update on public.checklists
for each row execute function public.touch_updated_at();

alter table public.checklists enable row level security;

create policy "checklists_select"
	on public.checklists for select to authenticated
	using (
		archived_at is null
		and (owner_id = auth.uid() or public.can_access('checklists', id, 'read'))
	);
create policy "checklists_insert_own"
	on public.checklists for insert to authenticated
	with check (owner_id = auth.uid());
create policy "checklists_update"
	on public.checklists for update to authenticated
	using (owner_id = auth.uid() or public.can_access('checklists', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('checklists', id, 'write'));
create policy "checklists_delete_own"
	on public.checklists for delete to authenticated
	using (owner_id = auth.uid());

create table public.checklist_items (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	checklist_id uuid not null references public.checklists (id) on delete cascade,
	title text not null,
	checked boolean not null default false,
	order_index integer not null default 0,
	created_at timestamptz not null default now()
);

create index checklist_items_list_idx
	on public.checklist_items (checklist_id, order_index);

alter table public.checklist_items enable row level security;

create policy "checklist_items_select"
	on public.checklist_items for select to authenticated
	using (
		exists (
			select 1 from public.checklists c
			where c.id = checklist_items.checklist_id
				and c.archived_at is null
				and (c.owner_id = auth.uid() or public.can_access('checklists', c.id, 'read'))
		)
	);
create policy "checklist_items_insert"
	on public.checklist_items for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.checklists c
			where c.id = checklist_items.checklist_id
				and (c.owner_id = auth.uid() or public.can_access('checklists', c.id, 'write'))
		)
	);
create policy "checklist_items_update"
	on public.checklist_items for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from public.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	);
create policy "checklist_items_delete"
	on public.checklist_items for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	);
