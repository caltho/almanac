-- Move every app-owned table into the `almanac` schema so this Supabase
-- project can be shared with another app without name collisions on the
-- public schema. Functions stay in public (they're generic plumbing) but
-- get their internal table references updated. Cross-table RLS policies
-- get dropped and recreated to point at the new schema; same-table
-- (owner_id-only) policies move with their tables and don't need rewriting.

create schema if not exists almanac;
grant usage on schema almanac to authenticated, anon, service_role;
grant all privileges on all tables in schema almanac to authenticated, anon, service_role;
alter default privileges in schema almanac
	grant all privileges on tables to authenticated, anon, service_role;
alter default privileges in schema almanac
	grant all privileges on sequences to authenticated, anon, service_role;

-- 1. Drop policies whose bodies hardcode public.<table_name>. We'll
-- recreate them after the move with almanac.<table_name>.
drop policy if exists "habit_checks_select" on public.habit_checks;
drop policy if exists "habit_checks_insert_own" on public.habit_checks;
drop policy if exists "habit_checks_delete" on public.habit_checks;

drop policy if exists "dataset_rows_select" on public.dataset_rows;
drop policy if exists "dataset_rows_insert" on public.dataset_rows;
drop policy if exists "dataset_rows_update" on public.dataset_rows;
drop policy if exists "dataset_rows_delete" on public.dataset_rows;

drop policy if exists "activity_logs_select" on public.activity_logs;
drop policy if exists "activity_logs_insert" on public.activity_logs;
drop policy if exists "activity_logs_delete" on public.activity_logs;

drop policy if exists "recipe_versions_select" on public.recipe_versions;
drop policy if exists "recipe_versions_insert" on public.recipe_versions;
drop policy if exists "recipe_versions_delete" on public.recipe_versions;

drop policy if exists "checklist_items_select" on public.checklist_items;
drop policy if exists "checklist_items_insert" on public.checklist_items;
drop policy if exists "checklist_items_update" on public.checklist_items;
drop policy if exists "checklist_items_delete" on public.checklist_items;

-- 2. Move every app table into almanac. Order is bottom-up so child tables
-- move before/after parents — FK references are by OID so ordering doesn't
-- actually matter, but listing here in roughly-creation order for clarity.
alter table public.profiles set schema almanac;
alter table public.shares set schema almanac;
alter table public.custom_attribute_defs set schema almanac;
alter table public.journal_entries set schema almanac;
alter table public.sleep_logs set schema almanac;
alter table public.tasks set schema almanac;
alter table public.habits set schema almanac;
alter table public.habit_checks set schema almanac;
alter table public.categories set schema almanac;
alter table public.transactions set schema almanac;
alter table public.budgets set schema almanac;
alter table public.import_batches set schema almanac;
alter table public.import_staging_rows set schema almanac;
alter table public.assets set schema almanac;
alter table public.net_worth_snapshots set schema almanac;
alter table public.projects set schema almanac;
alter table public.datasets set schema almanac;
alter table public.dataset_rows set schema almanac;
alter table public.shopping_items set schema almanac;
alter table public.activities set schema almanac;
alter table public.activity_logs set schema almanac;
alter table public.recipes set schema almanac;
alter table public.recipe_versions set schema almanac;
alter table public.checklists set schema almanac;
alter table public.checklist_items set schema almanac;
alter table public.quick_notes set schema almanac;
alter table public.events set schema almanac;
alter table public.people set schema almanac;
alter table public.event_people set schema almanac;
alter table public.task_lists set schema almanac;
alter table public.task_list_items set schema almanac;

-- 3. Recreate functions whose bodies reference moved tables. Functions
-- themselves stay in `public` so existing policy references (every
-- can_access call) keep resolving without rewriting.

create or replace function public.can_access(
	p_resource_type text,
	p_resource_id uuid,
	p_perm public.share_perm default 'read',
	p_extra jsonb default '{}'::jsonb
) returns boolean
language sql
stable
security invoker
set search_path = almanac, public
as $$
	select exists (
		select 1
		from almanac.shares s
		where s.grantee_id = auth.uid()
			and s.resource_type = p_resource_type
			and s.perms && array[p_perm]::public.share_perm[]
			and (s.resource_id is null or s.resource_id = p_resource_id)
			and (s.scope = '{}'::jsonb or s.scope <@ p_extra)
	);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = almanac, public
as $$
begin
	insert into almanac.profiles (id, display_name)
	values (
		new.id,
		coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
	)
	on conflict (id) do nothing;
	return new;
end;
$$;

create or replace function public.suggest_category_by_similarity(
	p_description text,
	p_min float default 0.3
) returns uuid
language sql stable security invoker
set search_path = almanac, public
as $$
	select category_id from almanac.transactions
	where owner_id = auth.uid()
		and deleted_at is null
		and category_id is not null
		and similarity(description, p_description) >= p_min
	order by similarity(description, p_description) desc,
		posted_at desc
	limit 1;
$$;

-- 4. Recreate cross-table policies on child tables, pointing at the
-- almanac schema. Same logic as before, just qualified differently.

-- habit_checks ←→ habits
create policy "habit_checks_select"
	on almanac.habit_checks for select to authenticated
	using (
		exists (
			select 1 from almanac.habits h
			where h.id = habit_checks.habit_id
				and (h.owner_id = auth.uid() or public.can_access('habits', h.id, 'read'))
		)
	);

create policy "habit_checks_insert_own"
	on almanac.habit_checks for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.habits h
			where h.id = habit_checks.habit_id
				and (h.owner_id = auth.uid() or public.can_access('habits', h.id, 'write'))
		)
	);

create policy "habit_checks_delete"
	on almanac.habit_checks for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.habits h
			where h.id = habit_checks.habit_id and public.can_access('habits', h.id, 'write')
		)
	);

-- dataset_rows ←→ datasets
create policy "dataset_rows_select"
	on almanac.dataset_rows for select to authenticated
	using (
		exists (
			select 1 from almanac.datasets d
			where d.id = dataset_rows.dataset_id
				and (d.owner_id = auth.uid() or public.can_access('datasets', d.id, 'read'))
		)
	);

create policy "dataset_rows_insert"
	on almanac.dataset_rows for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.datasets d
			where d.id = dataset_rows.dataset_id
				and (d.owner_id = auth.uid() or public.can_access('datasets', d.id, 'write'))
		)
	);

create policy "dataset_rows_update"
	on almanac.dataset_rows for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	);

create policy "dataset_rows_delete"
	on almanac.dataset_rows for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	);

-- activity_logs ←→ activities
create policy "activity_logs_select"
	on almanac.activity_logs for select to authenticated
	using (
		exists (
			select 1 from almanac.activities a
			where a.id = activity_logs.activity_id
				and a.archived_at is null
				and (a.owner_id = auth.uid() or public.can_access('activities', a.id, 'read'))
		)
	);

create policy "activity_logs_insert"
	on almanac.activity_logs for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.activities a
			where a.id = activity_logs.activity_id
				and (a.owner_id = auth.uid() or public.can_access('activities', a.id, 'write'))
		)
	);

create policy "activity_logs_delete"
	on almanac.activity_logs for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.activities a
			where a.id = activity_logs.activity_id and public.can_access('activities', a.id, 'write')
		)
	);

-- recipe_versions ←→ recipes
create policy "recipe_versions_select"
	on almanac.recipe_versions for select to authenticated
	using (
		exists (
			select 1 from almanac.recipes r
			where r.id = recipe_versions.recipe_id
				and (r.owner_id = auth.uid() or public.can_access('recipes', r.id, 'read'))
		)
	);

create policy "recipe_versions_insert"
	on almanac.recipe_versions for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.recipes r
			where r.id = recipe_versions.recipe_id
				and (r.owner_id = auth.uid() or public.can_access('recipes', r.id, 'write'))
		)
	);

create policy "recipe_versions_delete"
	on almanac.recipe_versions for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.recipes r
			where r.id = recipe_versions.recipe_id and public.can_access('recipes', r.id, 'write')
		)
	);

-- checklist_items ←→ checklists
create policy "checklist_items_select"
	on almanac.checklist_items for select to authenticated
	using (
		exists (
			select 1 from almanac.checklists c
			where c.id = checklist_items.checklist_id
				and c.archived_at is null
				and (c.owner_id = auth.uid() or public.can_access('checklists', c.id, 'read'))
		)
	);

create policy "checklist_items_insert"
	on almanac.checklist_items for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.checklists c
			where c.id = checklist_items.checklist_id
				and (c.owner_id = auth.uid() or public.can_access('checklists', c.id, 'write'))
		)
	);

create policy "checklist_items_update"
	on almanac.checklist_items for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	);

create policy "checklist_items_delete"
	on almanac.checklist_items for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.checklists c
			where c.id = checklist_items.checklist_id and public.can_access('checklists', c.id, 'write')
		)
	);
