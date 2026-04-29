-- Projects switch from a checklist-of-items model to a single rich-text body.
-- The user wants projects to feel like the old Notion-style pages, not a
-- to-do list. project_items is dropped entirely; existing items are gone.
--
-- body_html is sanitized server-side on every write (see
-- src/lib/server/sanitize-html.ts).

drop table if exists public.project_items;

alter table public.projects
	add column body_html text not null default '';
