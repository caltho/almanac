-- Replace the pages feature with user-defined datasets.
--
-- A dataset is a small named table the user designs themselves: a fixed
-- `name` column plus up to 7 user-named columns (`text` / `number` / `date`).
-- Stored as a single jsonb column-definition list on the dataset, with each
-- row's typed values living in `dataset_rows.data jsonb`.
--
-- The previous pages + blocks tables are dropped here — the rich-text page
-- model didn't earn its keep. Cascade catches the owner_id and parent_id
-- foreign keys. Earlier migrations created these tables; dropping them here
-- is a forward-only delete (no rollback path).

drop table if exists public.blocks cascade;
drop table if exists public.pages cascade;

create table public.datasets (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	-- Array of column definitions. Each item is
	--   { key: string, label: string, type: 'text'|'number'|'date' }
	-- `key` is stable; renaming `label` doesn't break stored row data.
	columns jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),

	-- At most 7 user-defined columns alongside the implicit `name`.
	constraint datasets_columns_is_array
		check (jsonb_typeof(columns) = 'array'),
	constraint datasets_columns_max_seven
		check (jsonb_array_length(columns) <= 7)
);

create index datasets_owner_idx on public.datasets (owner_id, name);

create trigger datasets_touch_updated_at
before update on public.datasets
for each row execute function public.touch_updated_at();

alter table public.datasets enable row level security;

create policy "datasets_select"
	on public.datasets for select to authenticated
	using (
		owner_id = auth.uid()
		or public.can_access('datasets', id, 'read')
	);
create policy "datasets_insert_own"
	on public.datasets for insert to authenticated
	with check (owner_id = auth.uid());
create policy "datasets_update"
	on public.datasets for update to authenticated
	using (owner_id = auth.uid() or public.can_access('datasets', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('datasets', id, 'write'));
create policy "datasets_delete_own"
	on public.datasets for delete to authenticated
	using (owner_id = auth.uid());

create table public.dataset_rows (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	dataset_id uuid not null references public.datasets (id) on delete cascade,
	name text not null default '',
	-- Map of column key -> value. Keys must match a column key in the parent
	-- dataset; values are coerced client-side / on insert per column type.
	data jsonb not null default '{}'::jsonb,
	order_index integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index dataset_rows_dataset_order_idx
	on public.dataset_rows (dataset_id, order_index);

create trigger dataset_rows_touch_updated_at
before update on public.dataset_rows
for each row execute function public.touch_updated_at();

alter table public.dataset_rows enable row level security;

-- Rows inherit visibility from their parent dataset.
create policy "dataset_rows_select"
	on public.dataset_rows for select to authenticated
	using (
		exists (
			select 1 from public.datasets d
			where d.id = dataset_rows.dataset_id
				and (d.owner_id = auth.uid() or public.can_access('datasets', d.id, 'read'))
		)
	);
create policy "dataset_rows_insert"
	on public.dataset_rows for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.datasets d
			where d.id = dataset_rows.dataset_id
				and (d.owner_id = auth.uid() or public.can_access('datasets', d.id, 'write'))
		)
	);
create policy "dataset_rows_update"
	on public.dataset_rows for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from public.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	);
create policy "dataset_rows_delete"
	on public.dataset_rows for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.datasets d
			where d.id = dataset_rows.dataset_id and public.can_access('datasets', d.id, 'write')
		)
	);
