-- CSV import pipeline: upload → stage → preview with proposals → confirm.
-- import_batches track runs; import_staging_rows holds parsed rows until
-- the user confirms and they're promoted into transactions.

create type public.import_batch_status as enum ('staged', 'confirmed', 'cancelled');

create table public.import_batches (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	filename text,
	source text, -- e.g. 'csv:anz'
	total_rows integer not null default 0,
	confirmed_rows integer not null default 0,
	duplicate_rows integer not null default 0,
	status public.import_batch_status not null default 'staged',
	created_at timestamptz not null default now(),
	confirmed_at timestamptz
);

create index import_batches_owner_idx
	on public.import_batches (owner_id, created_at desc);

alter table public.import_batches enable row level security;

create policy "import_batches_owner_all"
	on public.import_batches for all to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());

-- One row per parsed CSV line. proposed_category_id is filled by the
-- categoriser; confirmed_category_id is the user's final pick.
create table public.import_staging_rows (
	id uuid primary key default gen_random_uuid(),
	batch_id uuid not null references public.import_batches (id) on delete cascade,
	owner_id uuid not null references auth.users (id) on delete cascade,
	row_index integer not null,
	raw jsonb not null default '{}'::jsonb,
	posted_at date,
	description text,
	amount numeric(14, 2),
	proposed_category_id uuid references public.categories (id) on delete set null,
	-- 'rule' | 'trgm' | 'unclassified' | 'duplicate'
	proposed_source text,
	confirmed_category_id uuid references public.categories (id) on delete set null,
	is_duplicate boolean not null default false,
	include boolean not null default true,
	created_at timestamptz not null default now(),
	constraint staging_batch_index_unique unique (batch_id, row_index)
);

create index import_staging_rows_batch_idx
	on public.import_staging_rows (batch_id, row_index);

alter table public.import_staging_rows enable row level security;

create policy "import_staging_owner_all"
	on public.import_staging_rows for all to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
