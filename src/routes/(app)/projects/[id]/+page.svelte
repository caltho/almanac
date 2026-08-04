<script lang="ts">
	// {@html} renders project block bodies — sanitized server-side via
	// `$lib/server/sanitize-html` on every write (see /projects/[id]/api).
	/* eslint-disable svelte/no-at-html-tags */
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsEditor } from '$lib/custom-attrs';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import ColorTrigger from '$lib/components/ColorTrigger.svelte';
	import ColorDot from '$lib/components/ColorDot.svelte';
	import OptionTrigger from '$lib/components/OptionTrigger.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { type PaletteToken } from '$lib/palette';
	import { useUserData, type ProjectBlock } from '$lib/stores/userData.svelte';
	import Save from '@lucide/svelte/icons/save';
	import Plus from '@lucide/svelte/icons/plus';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';

	let { data, form } = $props();

	const userData = useUserData();

	let editing = $state(false);
	// svelte-ignore state_referenced_locally
	let name = $state(data.project.name);
	// svelte-ignore state_referenced_locally
	let description = $state(data.project.description ?? '');
	// svelte-ignore state_referenced_locally
	let status = $state(data.project.status);
	// svelte-ignore state_referenced_locally
	let color = $state<PaletteToken | null>((data.project.color as PaletteToken | null) ?? null);
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.project.custom as object) });

	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);

	const STATUS_OPTIONS = [
		{ value: 'active', label: 'Active' },
		{ value: 'done', label: 'Done' },
		{ value: 'archived', label: 'Archived' }
	];

	// --- Notes: an ordered list of rich-text blocks -------------------------
	// Blocks are hot in the userData store; mutations go through the /api
	// endpoint with optimistic updates (mirrors color/status + checklists).
	const blocks = $derived(
		userData.projectBlocks
			.filter((b) => b.project_id === data.project.id)
			.slice()
			.sort((a, b) => a.order_index - b.order_index)
	);

	let editingId = $state<string | null>(null);
	let adding = $state(false);
	let draftHeading = $state('');
	let draftBody = $state('');
	let savingBlock = $state(false);

	function startEdit(block: ProjectBlock) {
		adding = false;
		editingId = block.id;
		draftHeading = block.heading ?? '';
		draftBody = block.body_html;
	}

	function startAdd() {
		editingId = null;
		adding = true;
		draftHeading = '';
		draftBody = '';
	}

	function cancelBlockEdit() {
		editingId = null;
		adding = false;
		draftHeading = '';
		draftBody = '';
	}

	function isEmpty(html: string): boolean {
		return !html.replace(/<[^>]*>/g, '').trim();
	}

	async function post(payload: unknown): Promise<Response> {
		return fetch(`/projects/${data.project.id}/api`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
	}

	async function saveEdit(block: ProjectBlock) {
		const heading = draftHeading.trim() || null;
		const body_html = draftBody;
		const prev = { heading: block.heading, body_html: block.body_html };
		savingBlock = true;
		userData.updateProjectBlock(block.id, { heading, body_html });
		try {
			const res = await post({ op: 'updateBlock', id: block.id, heading, body_html });
			if (!res.ok) throw new Error();
			const b = (await res.json()) as { block: ProjectBlock };
			userData.updateProjectBlock(block.id, b.block);
			editingId = null;
		} catch {
			userData.updateProjectBlock(block.id, prev);
		} finally {
			savingBlock = false;
		}
	}

	async function saveNew() {
		const heading = draftHeading.trim() || null;
		const body_html = draftBody;
		if (!heading && isEmpty(body_html)) {
			cancelBlockEdit();
			return;
		}
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		const lastOrder = Math.max(-1, ...blocks.map((b) => b.order_index));
		const temp: ProjectBlock = {
			id: tempId,
			owner_id: data.project.owner_id,
			project_id: data.project.id,
			heading,
			body_html,
			order_index: lastOrder + 1
		};
		savingBlock = true;
		userData.addProjectBlock(temp);
		try {
			const res = await post({ op: 'addBlock', heading, body_html });
			if (!res.ok) throw new Error();
			const b = (await res.json()) as { block: ProjectBlock };
			userData.replaceProjectBlock(tempId, b.block);
			adding = false;
			draftHeading = '';
			draftBody = '';
		} catch {
			userData.removeProjectBlock(tempId);
		} finally {
			savingBlock = false;
		}
	}

	async function deleteBlock(block: ProjectBlock) {
		if (!confirm('Delete this block?')) return;
		userData.removeProjectBlock(block.id);
		if (editingId === block.id) editingId = null;
		try {
			const res = await post({ op: 'deleteBlock', id: block.id });
			if (!res.ok) throw new Error();
		} catch {
			// Rough rollback: re-add (order_index on the object restores its slot).
			userData.addProjectBlock(block);
		}
	}

	async function move(block: ProjectBlock, dir: -1 | 1) {
		const ordered = blocks;
		const idx = ordered.findIndex((b) => b.id === block.id);
		const swap = idx + dir;
		if (idx < 0 || swap < 0 || swap >= ordered.length) return;
		const prev = ordered.map((b) => ({ id: b.id, order_index: b.order_index }));
		const next = ordered.slice();
		[next[idx], next[swap]] = [next[swap], next[idx]];
		next.forEach((b, i) => userData.updateProjectBlock(b.id, { order_index: i }));
		try {
			const res = await post({ op: 'reorderBlocks', ids: next.map((b) => b.id) });
			if (!res.ok) throw new Error();
		} catch {
			for (const p of prev) userData.updateProjectBlock(p.id, { order_index: p.order_index });
		}
	}

	// Direct-manipulation handlers — color and status flip immediately via the
	// /api endpoint. They sit outside the main form so the user doesn't need to
	// open "Edit mode" just to recolour or close out a project.
	async function setColor(next: PaletteToken | null) {
		const prev = color;
		color = next;
		try {
			const res = await post({ op: 'setColor', color: next });
			if (!res.ok) throw new Error();
		} catch {
			color = prev;
		}
	}

	async function setStatus(next: string) {
		const prev = status;
		status = next;
		try {
			const res = await post({ op: 'setStatus', status: next });
			if (!res.ok) throw new Error();
		} catch {
			status = prev;
		}
	}
</script>

{#snippet blockEditor(onsave: () => void, label: string)}
	<div class="space-y-2 rounded-lg border bg-muted/20 p-3">
		<Input bind:value={draftHeading} placeholder="Heading (optional)" class="font-semibold" />
		<RichTextEditor bind:value={draftBody} placeholder="Write a note…" minHeight="12rem" />
		<div class="flex items-center gap-2">
			<Button type="button" size="sm" onclick={onsave} disabled={savingBlock}>
				<Save class="size-4" />
				{savingBlock ? 'Saving…' : label}
			</Button>
			<Button type="button" size="sm" variant="ghost" onclick={cancelBlockEdit}>Cancel</Button>
		</div>
	</div>
{/snippet}

<section class="space-y-6">
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<BackButton href="/projects" />
			<span class="text-xs tracking-widest text-muted-foreground uppercase">Projects</span>
		</div>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete project?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Delete</Button>
			</form>
		{/if}
	</div>

	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
				editing = false;
			};
		}}
		class="space-y-5"
	>
		<header class="space-y-2">
			<div class="flex items-center gap-2">
				<ColorTrigger value={color} onchange={setColor} size="md" label="Change project color" />
				{#if editing}
					<Input
						name="name"
						bind:value={name}
						required
						class="flex-1 text-2xl font-semibold tracking-tight"
					/>
				{:else}
					<h1 class="min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">
						{data.project.name}
					</h1>
				{/if}
				<OptionTrigger
					value={status}
					options={STATUS_OPTIONS}
					onchange={setStatus}
					label="Change project status"
				/>
				{#if data.canEdit && !editing}
					<Button size="sm" variant="outline" onclick={() => (editing = true)}>Edit</Button>
				{/if}
			</div>

			{#if editing}
				<div class="space-y-1.5">
					<Label class="text-xs">Description</Label>
					<Textarea name="description" rows={2} bind:value={description} />
				</div>
			{:else if data.project.description}
				<p class="text-sm text-muted-foreground">{data.project.description}</p>
			{/if}
		</header>

		{#if editing}
			<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}

			<div class="flex items-center gap-2">
				<Button type="submit" disabled={submitting}>
					<Save class="size-4" />
					{submitting ? 'Saving…' : 'Save'}
				</Button>
				<Button type="button" variant="ghost" onclick={() => (editing = false)}>Cancel</Button>
			</div>
		{/if}
	</form>

	<!-- Notes: ordered rich-text blocks -->
	<section class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Notes</h2>
			{#if data.canEdit && !adding && editingId === null && blocks.length > 0}
				<Button size="sm" variant="outline" onclick={startAdd}>
					<Plus class="size-4" />
					Add block
				</Button>
			{/if}
		</div>

		{#each blocks as block, i (block.id)}
			{#if editingId === block.id}
				{@render blockEditor(() => saveEdit(block), 'Save block')}
			{:else}
				<article class="group relative rounded-lg border bg-card px-4 py-3">
					{#if data.canEdit}
						<div
							class="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 focus-within:opacity-100"
						>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Move up"
								disabled={i === 0}
								onclick={() => move(block, -1)}
							>
								<ChevronUp class="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Move down"
								disabled={i === blocks.length - 1}
								onclick={() => move(block, 1)}
							>
								<ChevronDown class="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Edit block"
								onclick={() => startEdit(block)}
							>
								<Pencil class="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="Delete block"
								onclick={() => deleteBlock(block)}
							>
								<Trash2 class="size-4" />
							</Button>
						</div>
					{/if}

					{#if block.heading}
						<h3 class="mb-1 pr-28 font-semibold tracking-tight">{block.heading}</h3>
					{/if}
					{#if block.body_html}
						<div class="prose prose-sm max-w-none dark:prose-invert">{@html block.body_html}</div>
					{:else}
						<p class="text-sm text-muted-foreground italic">Empty block</p>
					{/if}
				</article>
			{/if}
		{/each}

		{#if adding}
			{@render blockEditor(saveNew, 'Add block')}
		{/if}

		{#if blocks.length === 0 && !adding}
			{#if data.canEdit}
				<button
					type="button"
					onclick={startAdd}
					class="block w-full rounded-lg border border-dashed bg-card px-4 py-12 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
				>
					Click to add a note block…
				</button>
			{:else}
				<p class="text-sm text-muted-foreground italic">No notes yet.</p>
			{/if}
		{/if}
	</section>

	{#if data.subprojects.length > 0}
		<section class="space-y-3">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Sub-projects · {data.subprojects.length}
			</h2>
			<ul class="divide-y divide-border rounded-md border">
				{#each data.subprojects as p (p.id)}
					<li>
						<a
							href={`/projects/${p.id}`}
							class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
						>
							<ColorDot token={p.color} />
							<span class="flex-1">{p.name}</span>
							<Badge variant="secondary" class="text-[10px] capitalize">{p.status}</Badge>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if data.tasks.length > 0}
		<section class="space-y-3">
			<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				Linked tasks · {data.tasks.length}
			</h2>
			<ul class="divide-y divide-border rounded-md border">
				{#each data.tasks as t (t.id)}
					<li>
						<a
							href={`/tasks/${t.id}`}
							class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
						>
							<span class="flex-1">{t.title}</span>
							<Badge variant="outline" class="text-[10px] capitalize">{t.status}</Badge>
							{#if t.due_date}
								<Badge variant="secondary" class="text-[10px]">{t.due_date}</Badge>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>
