<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import {
		asColumns,
		asRowData,
		DATASET_COLUMN_TYPE_LABELS,
		DATASET_COLUMN_TYPES,
		MAX_DATASET_COLUMNS,
		type DatasetColumn
	} from '$lib/datasets';

	let { data } = $props();

	const columns = $derived(asColumns(data.dataset.columns));

	// Column-manager UI state.
	let manageColumns = $state(false);

	// Track which row form is currently being saved so the "saving" pip
	// doesn't flicker globally. Keyed by row id.
	let saving = $state<Record<string, boolean>>({});

	// Reactive grid template based on column count: name + N data cols + delete.
	const gridStyle = $derived.by(() => {
		const cols = ['minmax(10rem,1.5fr)', ...columns.map(() => 'minmax(7rem,1fr)'), 'auto'];
		return `grid-template-columns: ${cols.join(' ')};`;
	});

	function inputType(t: DatasetColumn['type']): 'text' | 'number' | 'date' {
		if (t === 'number') return 'number';
		if (t === 'date') return 'date';
		return 'text';
	}

	function rowValue(row: (typeof data.rows)[number], col: DatasetColumn): string {
		const v = asRowData(row.data)[col.key];
		if (v === null || v === undefined) return '';
		return String(v);
	}

	// Blur on any input in a row submits its form (so a tab-out-of-cell saves).
	// Only fires the server action if the form's `dirty` data attribute is set.
	function onCellBlur(e: FocusEvent) {
		const el = e.currentTarget as HTMLInputElement;
		const formId = el.getAttribute('form');
		if (!formId) return;
		const form = document.getElementById(formId) as HTMLFormElement | null;
		if (!form) return;
		if (form.dataset.dirty !== 'true') return;
		form.requestSubmit();
	}

	function onCellInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		const formId = el.getAttribute('form');
		if (!formId) return;
		const form = document.getElementById(formId);
		if (form) form.dataset.dirty = 'true';
	}
</script>

<header class="flex flex-wrap items-start justify-between gap-3">
	<form
		method="POST"
		action="?/rename"
		use:enhance={() =>
			async ({ update }) =>
				await update({ reset: false })}
		class="flex min-w-0 flex-1 items-center gap-2"
	>
		<Input name="name" value={data.dataset.name} class="h-9 max-w-md text-lg font-semibold" />
		<Button type="submit" variant="outline" size="sm">Rename</Button>
	</form>
	<div class="flex shrink-0 gap-2">
		{#if data.canEdit}
			<Button size="sm" variant="outline" onclick={() => (manageColumns = !manageColumns)}>
				{manageColumns ? 'Done' : 'Columns'}
			</Button>
			<form
				method="POST"
				action="?/deleteDataset"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this dataset and all rows? This cannot be undone.')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Delete</Button>
			</form>
		{/if}
		<Button variant="ghost" size="sm" href="/projects/datasets">Back</Button>
	</div>
</header>

{#if manageColumns}
	<section class="space-y-3 rounded-md border p-4">
		<header class="flex items-center justify-between">
			<h2 class="text-sm font-semibold tracking-widest uppercase">Columns</h2>
			<Badge variant="secondary" class="text-[10px]">
				{columns.length} / {MAX_DATASET_COLUMNS}
			</Badge>
		</header>

		{#if columns.length === 0}
			<p class="text-sm text-muted-foreground">No custom columns yet.</p>
		{:else}
			<ul class="divide-y divide-border">
				{#each columns as col (col.key)}
					<li class="flex flex-wrap items-center gap-2 py-2">
						<form
							method="POST"
							action="?/renameColumn"
							use:enhance={() =>
								async ({ update }) =>
									await update({ reset: false })}
							class="flex flex-1 items-center gap-2"
						>
							<input type="hidden" name="key" value={col.key} />
							<Input name="label" value={col.label} class="h-8 max-w-xs" />
							<Badge variant="outline" class="text-[10px] capitalize">{col.type}</Badge>
							<code class="text-[10px] text-muted-foreground">{col.key}</code>
							<Button type="submit" variant="ghost" size="sm">Save</Button>
						</form>
						<form
							method="POST"
							action="?/deleteColumn"
							use:enhance={({ cancel }) => {
								if (
									!confirm(`Remove column "${col.label}"? Existing row values are kept but hidden.`)
								)
									cancel();
								return async ({ update }) => await update();
							}}
						>
							<input type="hidden" name="key" value={col.key} />
							<Button type="submit" variant="ghost" size="icon-sm" aria-label="Remove column">
								<Trash2 class="size-4" />
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		{/if}

		{#if columns.length < MAX_DATASET_COLUMNS}
			<form
				method="POST"
				action="?/addColumn"
				use:enhance={() =>
					async ({ update }) =>
						await update({ reset: true })}
				class="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end"
			>
				<div class="space-y-1">
					<Label for="new-col-label">New column label</Label>
					<Input
						id="new-col-label"
						name="label"
						placeholder="e.g. Author, Rating, Date read"
						required
					/>
				</div>
				<div class="space-y-1">
					<Label for="new-col-type">Type</Label>
					<select
						id="new-col-type"
						name="type"
						class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
					>
						{#each DATASET_COLUMN_TYPES as t (t)}
							<option value={t}>{DATASET_COLUMN_TYPE_LABELS[t]}</option>
						{/each}
					</select>
				</div>
				<Button type="submit">
					<Plus class="size-4" />
					<span>Add</span>
				</Button>
			</form>
		{/if}
	</section>
{/if}

<section class="rounded-md border">
	<!-- Header row -->
	<div
		class="grid items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
		style={gridStyle}
	>
		<span>Name</span>
		{#each columns as col (col.key)}
			<span>{col.label}</span>
		{/each}
		<span class="sr-only">Actions</span>
	</div>

	<!-- Hidden forms — one per row — referenced by inputs via `form="row-<id>"`.
		 This sidesteps the "no <form> inside <tr>" rule and lets us keep one
		 form-action per row for typed save semantics. -->
	{#each data.rows as row (row.id)}
		<form
			id={`row-${row.id}`}
			method="POST"
			action="?/updateRow"
			data-dirty="false"
			use:enhance={() => {
				saving[row.id] = true;
				return async ({ update, result }) => {
					await update({ reset: false });
					if (result.type === 'success') {
						const f = document.getElementById(`row-${row.id}`);
						if (f) f.dataset.dirty = 'false';
					}
					saving[row.id] = false;
				};
			}}
			class="hidden"
		>
			<input type="hidden" name="id" value={row.id} />
		</form>
		<form id={`del-row-${row.id}`} method="POST" action="?/deleteRow" use:enhance class="hidden">
			<input type="hidden" name="id" value={row.id} />
		</form>
	{/each}

	{#if data.rows.length === 0}
		<p class="px-3 py-6 text-center text-sm text-muted-foreground">No rows yet. Add one below.</p>
	{:else}
		<ul class="divide-y divide-border">
			{#each data.rows as row (row.id)}
				<li
					class="grid items-center gap-3 px-3 py-1.5 transition-colors hover:bg-muted/20"
					style={gridStyle}
				>
					<Input
						form={`row-${row.id}`}
						name="name"
						value={row.name ?? ''}
						placeholder="…"
						oninput={onCellInput}
						onblur={onCellBlur}
						class="h-8 border-transparent bg-transparent shadow-none focus:border-input focus:bg-background"
					/>
					{#each columns as col (col.key)}
						<Input
							form={`row-${row.id}`}
							name={`col:${col.key}`}
							type={inputType(col.type)}
							value={rowValue(row, col)}
							step={col.type === 'number' ? 'any' : undefined}
							oninput={onCellInput}
							onblur={onCellBlur}
							class="h-8 border-transparent bg-transparent shadow-none focus:border-input focus:bg-background"
						/>
					{/each}
					<div class="flex items-center justify-end gap-2">
						{#if saving[row.id]}
							<span class="text-[10px] text-muted-foreground">…</span>
						{/if}
						<Button
							type="submit"
							form={`del-row-${row.id}`}
							variant="ghost"
							size="icon-sm"
							aria-label="Delete row"
						>
							<Trash2 class="size-3.5" />
						</Button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	{#if data.canEdit}
		<form
			method="POST"
			action="?/addRow"
			use:enhance={() =>
				async ({ update }) =>
					await update({ reset: false })}
			class="border-t"
		>
			<Button type="submit" variant="ghost" class="w-full justify-start gap-2 rounded-none py-2">
				<Plus class="size-4" />
				<span>Add row</span>
			</Button>
		</form>
	{/if}
</section>
