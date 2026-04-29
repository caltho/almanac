-- Shopping items get a palette color used to sub-group the list. Within each
-- of the three status sections (Buy, Reminder, Stocked) items cluster by
-- color so related groceries (produce, pantry, …) sit together.
--
-- NULL means "ungrouped". Color values are palette tokens (see
-- src/lib/palette.ts), not hex.

alter table public.shopping_items
	add column color text;
