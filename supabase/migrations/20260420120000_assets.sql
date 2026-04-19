-- assets — owned things: cash accounts, investments, property, possessions.
-- Doubles as household inventory when used with location + tags.

create type public.asset_kind as enum (
	'cash', 'investment', 'property', 'vehicle', 'possession', 'other'
);

create table public.assets (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	kind public.asset_kind not null default 'other',
	value numeric(14, 2),
	currency text not null default 'AUD',
	acquired_on date,
	location text,
	tags text[] not null default '{}',
	notes text,
	photo_url text,
	custom jsonb not null default '{}'::jsonb,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index assets_owner_kind_idx on public.assets (owner_id, kind) where archived_at is null;
create index assets_owner_tags_idx on public.assets using gin (tags) where archived_at is null;

create trigger assets_touch_updated_at
before update on public.assets
for each row execute function public.touch_updated_at();

alter table public.assets enable row level security;

create policy "assets_select"
	on public.assets for select to authenticated
	using (owner_id = auth.uid() or public.can_access('assets', id, 'read'));
create policy "assets_insert_own"
	on public.assets for insert to authenticated
	with check (owner_id = auth.uid());
create policy "assets_update"
	on public.assets for update to authenticated
	using (owner_id = auth.uid() or public.can_access('assets', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('assets', id, 'write'));
create policy "assets_delete_own"
	on public.assets for delete to authenticated
	using (owner_id = auth.uid());

-- Net worth snapshots — one per date. The breakdown jsonb is the per-kind sum
-- at the moment of the snapshot, so historical aggregates survive later edits
-- to individual asset values.
create table public.net_worth_snapshots (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	snapshot_date date not null default current_date,
	total_value numeric(14, 2) not null,
	breakdown jsonb not null default '{}'::jsonb,
	currency text not null default 'AUD',
	note text,
	created_at timestamptz not null default now(),
	constraint snapshots_unique_date unique (owner_id, snapshot_date)
);

create index net_worth_snapshots_owner_date_idx
	on public.net_worth_snapshots (owner_id, snapshot_date desc);

alter table public.net_worth_snapshots enable row level security;

create policy "snapshots_owner_all"
	on public.net_worth_snapshots for all to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
