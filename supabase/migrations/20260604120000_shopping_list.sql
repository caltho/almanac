-- shopping_list_items — the one-shot "what to buy on the next shop" list under
-- /food/shopping-list. Distinct from `shopping_items` (the recurring Supplies
-- restock register): a shopping-list item is ephemeral, ticked off as you
-- shop, then the whole list is cleared.
--
-- Items can originate three ways (`source`):
--   'manual'  — typed in directly
--   'supply'  — booted over from the Supplies "Buy" section. `supply_item_id`
--               links back so "Clear & mark supplies stocked" can flip the
--               originating shopping_items row to status='stocked'.
--   'recipe'  — pulled from a recipe's ingredient list.
--
-- Single-user feature for now: owner-only RLS (no shares), matching task_lists.

create table almanac.shopping_list_items (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	name text not null,
	checked boolean not null default false,
	source text not null default 'manual',
	-- When sourced from Supplies, the originating row. ON DELETE SET NULL so
	-- deleting a supply item just unlinks rather than dropping the list entry.
	supply_item_id uuid references almanac.shopping_items (id) on delete set null,
	created_at timestamptz not null default now()
);

create index shopping_list_items_owner_idx
	on almanac.shopping_list_items (owner_id, checked, created_at);

alter table almanac.shopping_list_items enable row level security;

create policy "shopping_list_items_select_own"
	on almanac.shopping_list_items for select to authenticated
	using (owner_id = auth.uid());
create policy "shopping_list_items_insert_own"
	on almanac.shopping_list_items for insert to authenticated
	with check (owner_id = auth.uid());
create policy "shopping_list_items_update_own"
	on almanac.shopping_list_items for update to authenticated
	using (owner_id = auth.uid())
	with check (owner_id = auth.uid());
create policy "shopping_list_items_delete_own"
	on almanac.shopping_list_items for delete to authenticated
	using (owner_id = auth.uid());

notify pgrst, 'reload schema';
