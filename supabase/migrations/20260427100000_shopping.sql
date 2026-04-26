-- shopping_items — the "Shopping" sub-tab under Tasks.
--
-- Items hold an explicit `status` (buy | stocked) plus a restock cadence and
-- the timestamp of the last purchase. The "Reminder" state in the UI is
-- derived (status='stocked' AND now >= last_purchased_at + restock interval),
-- so it isn't a stored value.
--
-- Clicking the status button on the client cycles:
--   Buy        → Stocked (writes last_purchased_at = now())
--   Stocked    → Buy
--   Reminder   → Stocked (writes a fresh last_purchased_at = now())
-- The 'reminder' visual is computed from the same row.

create type public.shopping_status as enum ('buy', 'stocked');
create type public.shopping_period as enum ('weekly', 'monthly', 'quarterly', 'yearly');

create table public.shopping_items (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	status public.shopping_status not null default 'buy',
	restock_period public.shopping_period not null default 'monthly',
	last_purchased_at timestamptz,
	notes text,
	custom jsonb not null default '{}'::jsonb,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index shopping_items_owner_idx
	on public.shopping_items (owner_id, status, last_purchased_at)
	where archived_at is null;

create trigger shopping_items_touch_updated_at
before update on public.shopping_items
for each row execute function public.touch_updated_at();

-- Stamp last_purchased_at automatically when status flips to 'stocked' so
-- the app doesn't have to remember to set it in every action path.
create or replace function public.shopping_items_stamp_purchased()
returns trigger language plpgsql as $$
begin
	if new.status = 'stocked' and (old.status is distinct from 'stocked') then
		new.last_purchased_at := coalesce(new.last_purchased_at, now());
	end if;
	return new;
end;
$$;

create trigger shopping_items_stamp_purchased_trg
before update on public.shopping_items
for each row execute function public.shopping_items_stamp_purchased();

alter table public.shopping_items enable row level security;

create policy "shopping_items_select"
	on public.shopping_items for select to authenticated
	using (
		archived_at is null
		and (owner_id = auth.uid() or public.can_access('shopping_items', id, 'read'))
	);

create policy "shopping_items_insert_own"
	on public.shopping_items for insert to authenticated
	with check (owner_id = auth.uid());

create policy "shopping_items_update"
	on public.shopping_items for update to authenticated
	using (owner_id = auth.uid() or public.can_access('shopping_items', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('shopping_items', id, 'write'));

create policy "shopping_items_delete_owner"
	on public.shopping_items for delete to authenticated
	using (owner_id = auth.uid());
