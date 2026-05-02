-- Quick notes — short title + body scratchpad lines pinned to the top of
-- /journal. Distinct from journal entries (which are dated longform with
-- mood + custom attrs); quick notes are throwaway-ish references like a
-- TV-lift admin URL or a router IP.
--
-- "internalised" is the user's term for "I've memorised this / read it,
-- park it grey at the bottom for now". A boolean so the row stays sortable
-- by created_at within each visual group.

create table public.quick_notes (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	title text not null,
	body text not null default '',
	color text,
	internalised boolean not null default false,
	order_index integer not null default 0,
	custom jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index quick_notes_owner_idx
	on public.quick_notes (owner_id, internalised, created_at desc);

create trigger quick_notes_touch_updated_at
before update on public.quick_notes
for each row execute function public.touch_updated_at();

alter table public.quick_notes enable row level security;

create policy "quick_notes_select_own"
	on public.quick_notes for select to authenticated
	using (owner_id = auth.uid());
create policy "quick_notes_insert_own"
	on public.quick_notes for insert to authenticated
	with check (owner_id = auth.uid());
create policy "quick_notes_update_own"
	on public.quick_notes for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "quick_notes_delete_own"
	on public.quick_notes for delete to authenticated
	using (owner_id = auth.uid());
