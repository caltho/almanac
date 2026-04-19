-- shares
-- Single source of truth for cross-user access. Domain tables' RLS policies
-- consult can_access(resource_type, resource_id, perm) to extend beyond
-- "owner_id = auth.uid()".

create type public.share_perm as enum ('read', 'comment', 'write');

create table public.shares (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	grantee_id uuid not null references auth.users (id) on delete cascade,
	-- Domain name: 'journal', 'sleep', 'tasks', 'habits', 'finance', 'assets',
	-- 'projects', 'pages'. Keep free-form so future domains don't need a migration.
	resource_type text not null,
	-- Null => whole-domain share. Non-null => specific row in that domain.
	resource_id uuid,
	-- Optional narrowing filter (e.g. {"category_id": "..."} for finance).
	-- Compared against each row's attributes via `scope @> extra` in can_access().
	scope jsonb not null default '{}'::jsonb,
	perms public.share_perm[] not null default array['read']::public.share_perm[],
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint shares_no_self check (owner_id <> grantee_id),
	constraint shares_perms_nonempty check (array_length(perms, 1) >= 1)
);

create index shares_grantee_idx on public.shares (grantee_id, resource_type);
create index shares_owner_idx on public.shares (owner_id, resource_type);
-- Prevent duplicate grants on the exact same tuple.
create unique index shares_unique_grant_idx
	on public.shares (owner_id, grantee_id, resource_type, coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid));

create trigger shares_touch_updated_at
before update on public.shares
for each row execute function public.touch_updated_at();

-- RLS
alter table public.shares enable row level security;

-- Owner sees their outgoing shares; grantee sees their incoming shares.
create policy "shares_select_owner_or_grantee"
	on public.shares
	for select
	to authenticated
	using (owner_id = auth.uid() or grantee_id = auth.uid());

-- Only the owner can create shares, and only for themselves.
create policy "shares_insert_owner"
	on public.shares
	for insert
	to authenticated
	with check (owner_id = auth.uid());

-- Only the owner can update share perms / scope.
create policy "shares_update_owner"
	on public.shares
	for update
	to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());

-- Owner can revoke; grantee can also revoke (walk away from a share).
create policy "shares_delete_owner_or_grantee"
	on public.shares
	for delete
	to authenticated
	using (owner_id = auth.uid() or grantee_id = auth.uid());
