-- Pages get a single rich-text body. The earlier blocks-table model was too
-- fiddly to use in practice; we keep the table around (no destructive drop)
-- but the UI now writes HTML straight into pages.body_html. Sanitization
-- happens app-side before insert/update.

alter table public.pages
	add column if not exists body_html text not null default '';
