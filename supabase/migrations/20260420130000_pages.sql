-- pages + blocks — Notion-lite. Pages nest; each holds an ordered list of
-- blocks. Block content is flexible jsonb validated against a per-type schema
-- by the block registry in the app.

create table public.pages (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	parent_id uuid references public.pages (id) on delete cascade,
	title text not null default 'Untitled',
	icon text,
	order_index integer not null default 0,
	archived_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index pages_owner_parent_idx on public.pages (owner_id, parent_id, order_index)
	where archived_at is null;

create trigger pages_touch_updated_at
before update on public.pages
for each row execute function public.touch_updated_at();

alter table public.pages enable row level security;

create policy "pages_select"
	on public.pages for select to authenticated
	using (
		archived_at is null
		and (owner_id = auth.uid() or public.can_access('pages', id, 'read'))
	);
create policy "pages_insert_own"
	on public.pages for insert to authenticated
	with check (owner_id = auth.uid());
create policy "pages_update"
	on public.pages for update to authenticated
	using (owner_id = auth.uid() or public.can_access('pages', id, 'write'))
	with check (owner_id = auth.uid() or public.can_access('pages', id, 'write'));
create policy "pages_delete_own"
	on public.pages for delete to authenticated
	using (owner_id = auth.uid());

create table public.blocks (
	id uuid primary key default gen_random_uuid(),
	owner_id uuid not null references auth.users (id) on delete cascade,
	page_id uuid not null references public.pages (id) on delete cascade,
	parent_block_id uuid references public.blocks (id) on delete cascade,
	order_index integer not null default 0,
	-- Block type id from src/lib/blocks/registry.ts
	type text not null,
	content jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index blocks_page_order_idx
	on public.blocks (page_id, parent_block_id, order_index);

create trigger blocks_touch_updated_at
before update on public.blocks
for each row execute function public.touch_updated_at();

alter table public.blocks enable row level security;

-- Blocks inherit visibility from their page.
create policy "blocks_select"
	on public.blocks for select to authenticated
	using (
		exists (
			select 1 from public.pages p
			where p.id = blocks.page_id
				and p.archived_at is null
				and (p.owner_id = auth.uid() or public.can_access('pages', p.id, 'read'))
		)
	);
create policy "blocks_insert"
	on public.blocks for insert to authenticated
	with check (
		owner_id = auth.uid()
		and exists (
			select 1 from public.pages p
			where p.id = blocks.page_id
				and (p.owner_id = auth.uid() or public.can_access('pages', p.id, 'write'))
		)
	);
create policy "blocks_update"
	on public.blocks for update to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.pages p
			where p.id = blocks.page_id and public.can_access('pages', p.id, 'write')
		)
	)
	with check (
		owner_id = auth.uid()
		or exists (
			select 1 from public.pages p
			where p.id = blocks.page_id and public.can_access('pages', p.id, 'write')
		)
	);
create policy "blocks_delete"
	on public.blocks for delete to authenticated
	using (
		owner_id = auth.uid()
		or exists (
			select 1 from public.pages p
			where p.id = blocks.page_id and public.can_access('pages', p.id, 'write')
		)
	);
