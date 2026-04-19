-- Finance core: categories (tree) + transactions + budgets.
-- Single-currency v1 (column exists for future-proofing).

create extension if not exists pg_trgm;

-- categories: tree, with optional rules jsonb driving auto-categorisation.
-- rules: [{"kind": "keyword"|"regex", "pattern": "...", "case_sensitive": bool}]
create table public.categories (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	parent_id uuid references public.categories (id) on delete set null,
	color text,
	rules jsonb not null default '[]'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (owner_id, parent_id, name)
);

create index categories_owner_idx on public.categories (owner_id);

create trigger categories_touch_updated_at
before update on public.categories
for each row execute function public.touch_updated_at();

alter table public.categories enable row level security;

create policy "categories_select"
	on public.categories for select to authenticated
	using (owner_id = auth.uid() or public.can_access('finance', id, 'read'));
create policy "categories_insert_own"
	on public.categories for insert to authenticated
	with check (owner_id = auth.uid());
create policy "categories_update_own"
	on public.categories for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "categories_delete_own"
	on public.categories for delete to authenticated
	using (owner_id = auth.uid());

-- transactions
create table public.transactions (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	posted_at date not null,
	description text not null,
	amount numeric(14, 2) not null,
	currency text not null default 'AUD',
	category_id uuid references public.categories (id) on delete set null,
	-- Free-form: 'csv:anz' | 'csv:commbank' | 'manual' | 'legacy-import'
	source text not null default 'manual',
	-- Original bank data for provenance.
	raw jsonb not null default '{}'::jsonb,
	custom jsonb not null default '{}'::jsonb,
	-- Stable normalised fingerprint for dedupe.
	description_hash text generated always as (md5(lower(description))) stored,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create index transactions_owner_date_idx
	on public.transactions (owner_id, posted_at desc)
	where deleted_at is null;
create index transactions_owner_category_idx
	on public.transactions (owner_id, category_id, posted_at desc)
	where deleted_at is null;
-- Dedupe natural key — prevents re-importing the same CSV row.
create unique index transactions_dedupe_idx
	on public.transactions (owner_id, posted_at, amount, description_hash)
	where deleted_at is null;
-- Trigram index for similarity search.
create index transactions_description_trgm_idx
	on public.transactions using gin (description gin_trgm_ops)
	where deleted_at is null;

create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function public.touch_updated_at();

alter table public.transactions enable row level security;

create policy "transactions_select"
	on public.transactions for select to authenticated
	using (
		deleted_at is null
		and (owner_id = auth.uid() or public.can_access('finance', id, 'read'))
	);
create policy "transactions_insert_own"
	on public.transactions for insert to authenticated
	with check (owner_id = auth.uid());
create policy "transactions_update"
	on public.transactions for update to authenticated
	using (owner_id = auth.uid() or public.can_access('finance', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('finance', id, 'write'));
create policy "transactions_delete_own"
	on public.transactions for delete to authenticated
	using (owner_id = auth.uid());

-- suggest_category_by_similarity — given a description, returns the
-- category_id of the historically-closest transaction.
create or replace function public.suggest_category_by_similarity(
	p_description text,
	p_min float default 0.3
) returns uuid
language sql stable security invoker
set search_path = public
as $$
	select category_id from public.transactions
	where owner_id = auth.uid()
		and deleted_at is null
		and category_id is not null
		and similarity(description, p_description) >= p_min
	order by similarity(description, p_description) desc,
		posted_at desc
	limit 1;
$$;
revoke all on function public.suggest_category_by_similarity(text, float) from public;
grant execute on function public.suggest_category_by_similarity(text, float) to authenticated;

-- budgets: one per (category, period-start). Period inferred from the app ('monthly' typical).
create type public.budget_period as enum ('weekly', 'monthly', 'yearly');

create table public.budgets (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	category_id uuid not null references public.categories (id) on delete cascade,
	period public.budget_period not null default 'monthly',
	amount numeric(14, 2) not null,
	currency text not null default 'AUD',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (owner_id, category_id, period)
);

create index budgets_owner_idx on public.budgets (owner_id);

create trigger budgets_touch_updated_at
before update on public.budgets
for each row execute function public.touch_updated_at();

alter table public.budgets enable row level security;

create policy "budgets_owner_all"
	on public.budgets for all to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
