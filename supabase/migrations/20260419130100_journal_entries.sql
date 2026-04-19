-- journal_entries — first fixed domain. Proves the custom-attributes engine
-- (M2) and grows into the full Journal UI in M3.

create table public.journal_entries (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	entry_date date not null default current_date,
	title text,
	body text,
	mood smallint check (mood is null or (mood between 1 and 10)),
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	deleted_at timestamptz
);

create index journal_entries_owner_date_idx
	on public.journal_entries (owner_id, entry_date desc)
	where deleted_at is null;

create trigger journal_entries_touch_updated_at
before update on public.journal_entries
for each row execute function public.touch_updated_at();

alter table public.journal_entries enable row level security;

-- Read: owner, or grantee via a share (domain 'journal')
create policy "journal_entries_select"
	on public.journal_entries
	for select
	to authenticated
	using (
		deleted_at is null
		and (
			owner_id = auth.uid()
			or public.can_access('journal', id, 'read')
		)
	);

-- Insert: only own rows
create policy "journal_entries_insert_own"
	on public.journal_entries
	for insert
	to authenticated
	with check (owner_id = auth.uid());

-- Update: owner, or grantee with write perm
create policy "journal_entries_update"
	on public.journal_entries
	for update
	to authenticated
	using (
		owner_id = auth.uid()
		or public.can_access('journal', id, 'write')
	)
	with check (
		owner_id = auth.uid()
		or public.can_access('journal', id, 'write')
	);

-- Delete (soft via deleted_at in app; hard delete reserved for owner)
create policy "journal_entries_delete_owner"
	on public.journal_entries
	for delete
	to authenticated
	using (owner_id = auth.uid());
