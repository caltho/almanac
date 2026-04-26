-- Add a 'none' value to shopping_period for items that should never auto-flip
-- to "Reminder" (e.g. one-off shopping list entries that aren't on a cycle).
-- ALTER TYPE ... ADD VALUE can't run inside a transaction block, so this
-- migration only adds the enum value. App-side logic treats 'none' as
-- "never derives Reminder state".

alter type public.shopping_period add value if not exists 'none';
