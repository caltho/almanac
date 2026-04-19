-- Custom attributes engine.
-- Each fixed-domain row has a `custom jsonb` column; user-defined keys in
-- custom_attribute_defs drive the UI + validation.

create type public.custom_attr_type as enum (
	'text',
	'longtext',
	'number',
	'boolean',
	'date',
	'datetime',
	'select',
	'multiselect',
	'url',
	'rating'
);

create table public.custom_attribute_defs (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	-- e.g. 'journal_entries', 'sleep_logs', 'tasks'. Free-form to follow schema growth.
	table_name text not null,
	-- snake_case key used as the jsonb property on each row's `custom` column.
	key text not null,
	label text not null,
	type public.custom_attr_type not null,
	-- Type-specific options, e.g. { "options": ["red","blue"] } for select,
	-- { "max": 5 } for rating, { "min":0, "max":100, "unit":"kg" } for number.
	ui_hints jsonb not null default '{}'::jsonb,
	required boolean not null default false,
	order_index integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint custom_attr_defs_unique_key unique (owner_id, table_name, key),
	constraint custom_attr_defs_key_format check (key ~ '^[a-z][a-z0-9_]{0,47}$')
);

create index custom_attribute_defs_owner_table_idx
	on public.custom_attribute_defs (owner_id, table_name, order_index);

create trigger custom_attribute_defs_touch_updated_at
before update on public.custom_attribute_defs
for each row execute function public.touch_updated_at();

alter table public.custom_attribute_defs enable row level security;

create policy "custom_attrs_owner_all"
	on public.custom_attribute_defs
	for all
	to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
