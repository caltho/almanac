-- project_blocks — multiple rich-text note blocks per project. Replaces the
-- single `projects.body_html` field (retired at the end of this migration): a
-- project's notes are now an ordered list of blocks, each an optional heading
-- plus a sanitized rich-text body. Mirrors the checklist_items parent-inherited
-- RLS pattern (visibility/writeability derives from the owning project, so
-- shared projects share their blocks automatically).

create table almanac.project_blocks (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	project_id uuid not null references almanac.projects (id) on delete cascade,
	heading text,
	body_html text not null default '',
	order_index integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index project_blocks_project_idx
	on almanac.project_blocks (project_id, order_index);

create trigger project_blocks_touch_updated_at
before update on almanac.project_blocks
for each row execute function public.touch_updated_at();

alter table almanac.project_blocks enable row level security;

create policy "project_blocks_select"
	on almanac.project_blocks for select to authenticated
	using (
		exists (
			select 1 from almanac.projects p
			where p.id = project_blocks.project_id
				and (p.owner_id = auth.uid() or public.can_access('projects', p.id, 'read'))
		)
	);
create policy "project_blocks_insert"
	on almanac.project_blocks for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from almanac.projects p
			where p.id = project_blocks.project_id
				and (p.owner_id = auth.uid() or public.can_access('projects', p.id, 'write'))
		)
	);
create policy "project_blocks_update"
	on almanac.project_blocks for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.projects p
			where p.id = project_blocks.project_id and public.can_access('projects', p.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.projects p
			where p.id = project_blocks.project_id and public.can_access('projects', p.id, 'write')
		)
	);
create policy "project_blocks_delete"
	on almanac.project_blocks for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from almanac.projects p
			where p.id = project_blocks.project_id and public.can_access('projects', p.id, 'write')
		)
	);

-- Migrate the existing single body into the first block of every project that
-- has non-empty notes. order_index 0, no heading. Projects with an empty body
-- start life with no blocks (the UI shows a "add a block" prompt).
insert into almanac.project_blocks (owner_id, project_id, heading, body_html, order_index)
select p.owner_id, p.id, null, p.body_html, 0
from almanac.projects p
where coalesce(btrim(p.body_html), '') <> '';

-- The single body is retired; project notes now live entirely in project_blocks.
alter table almanac.projects drop column body_html;

notify pgrst, 'reload schema';
