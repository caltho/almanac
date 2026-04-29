-- Recipes — a small recipe book. Each recipe has a current state (ingredients
-- + method, both rich-text HTML) plus an append-only stream of versions you
-- explicitly snapshot when a recipe morphs. Versions also carry a "how it
-- turned out" comment.
--
-- Why a versions table instead of a single body that auto-snapshots: the
-- user wants to deliberately mark a fork-point ("tried it with extra garlic
-- — too much"), not see every keystroke. Versions are read-only history.

create table public.recipes (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	description text,
	-- Current working version. Sanitized on the server (see
	-- src/lib/server/sanitize-html.ts) before insert/update.
	ingredients_html text not null default '',
	method_html text not null default '',
	custom jsonb not null default '{}'::jsonb,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index recipes_owner_idx
	on public.recipes (owner_id, name)
	where archived_at is null;

create trigger recipes_touch_updated_at
before update on public.recipes
for each row execute function public.touch_updated_at();

alter table public.recipes enable row level security;

create policy "recipes_select"
	on public.recipes for select to authenticated
	using (
		archived_at is null
		and (owner_id = auth.uid() or public.can_access('recipes', id, 'read'))
	);
create policy "recipes_insert_own"
	on public.recipes for insert to authenticated
	with check (owner_id = auth.uid());
create policy "recipes_update"
	on public.recipes for update to authenticated
	using (owner_id = auth.uid() or public.can_access('recipes', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('recipes', id, 'write'));
create policy "recipes_delete_own"
	on public.recipes for delete to authenticated
	using (owner_id = auth.uid());

-- Snapshots of how a recipe looked at the moment the user clicked "Save
-- iteration" plus their note on how it turned out.
create table public.recipe_versions (
	id uuid primary key default gen_random_uuid(),
	recipe_id uuid not null references public.recipes (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	-- Snapshot of recipe state at the moment of saving.
	ingredients_html text not null default '',
	method_html text not null default '',
	-- "How did this turn out?" — free-form, optional.
	notes text,
	created_at timestamptz not null default now()
);

create index recipe_versions_recipe_idx
	on public.recipe_versions (recipe_id, created_at desc);

alter table public.recipe_versions enable row level security;

-- Versions inherit visibility from their parent recipe.
create policy "recipe_versions_select"
	on public.recipe_versions for select to authenticated
	using (
		exists (
			select 1 from public.recipes r
			where r.id = recipe_versions.recipe_id
				and r.archived_at is null
				and (r.owner_id = auth.uid() or public.can_access('recipes', r.id, 'read'))
		)
	);
create policy "recipe_versions_insert"
	on public.recipe_versions for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.recipes r
			where r.id = recipe_versions.recipe_id
				and (r.owner_id = auth.uid() or public.can_access('recipes', r.id, 'write'))
		)
	);
create policy "recipe_versions_delete"
	on public.recipe_versions for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.recipes r
			where r.id = recipe_versions.recipe_id and public.can_access('recipes', r.id, 'write')
		)
	);
