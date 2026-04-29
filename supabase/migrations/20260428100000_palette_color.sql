-- Shared 8-token palette for color pickers across the app.
--
-- We store colors as short string keys (e.g. 'blue', 'green') instead of hex
-- values so the palette can be re-tuned in CSS without rewriting rows. The
-- canonical token set lives in src/lib/palette.ts; the DB only enforces the
-- column shape (text). NULL means "no color".
--
-- Existing tables already have a `color text` column (projects, activities,
-- categories). Migrate any prior hex values to NULL — they'll re-pick a token
-- the next time the row is edited. (Safe because only the user has been
-- using the app and they explicitly want to switch to the token palette.)

update public.projects set color = null where color is not null;
update public.activities set color = null where color is not null;
update public.categories set color = null where color is not null;
