<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { BLOCK_LABELS, BLOCK_TYPES, BlockComponent, coerceBlockContent } from '$lib/blocks';
	import type { BlockType } from '$lib/blocks';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import Plus from '@lucide/svelte/icons/plus';

	let { data } = $props();

	let editingMeta = $state(false);
	let addingType = $state<BlockType>('paragraph');

	// Keep local drafts of block contents so the user can type freely; persist
	// with a form submit on blur.
	// svelte-ignore state_referenced_locally
	let drafts = $state(
		Object.fromEntries(
			data.blocks.map((b) => [b.id, coerceBlockContent(b.type, b.content)])
		) as Record<string, unknown>
	);
</script>

<header class="flex items-start justify-between">
	<div class="flex min-w-0 items-center gap-3">
		<span class="text-3xl leading-none">{data.page.icon ?? '📄'}</span>
		<div class="min-w-0">
			<h1 class="truncate text-2xl font-semibold tracking-tight">{data.page.title}</h1>
			<p class="text-xs text-muted-foreground">
				Last updated {new Date(data.page.updated_at).toLocaleString()}
			</p>
		</div>
	</div>
	<div class="flex shrink-0 gap-2">
		{#if data.canEdit}
			<Button size="sm" variant="outline" onclick={() => (editingMeta = !editingMeta)}>
				{editingMeta ? 'Close' : 'Rename'}
			</Button>
			<form
				method="POST"
				action="?/deletePage"
				use:enhance={({ cancel }) => {
					if (!confirm('Archive this page? Blocks come with it.')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Archive</Button>
			</form>
		{/if}
		<Button variant="ghost" size="sm" href="/pages">Back</Button>
	</div>
</header>

{#if editingMeta}
	<form
		method="POST"
		action="?/rename"
		use:enhance={() =>
			async ({ update }) => {
				await update();
				editingMeta = false;
			}}
		class="grid gap-3 rounded-md border p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end"
	>
		<div class="space-y-1">
			<Label>Icon</Label>
			<Input name="icon" value={data.page.icon ?? ''} maxlength={4} class="w-20" />
		</div>
		<div class="space-y-1">
			<Label>Title</Label>
			<Input name="title" value={data.page.title} required />
		</div>
		<div class="space-y-1">
			<Label>Parent</Label>
			<select
				name="parent_id"
				class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
			>
				<option value="">— top level —</option>
				{#each data.allPages.filter((p) => p.id !== data.page.id) as p (p.id)}
					<option value={p.id} selected={data.page.parent_id === p.id}>{p.title}</option>
				{/each}
			</select>
		</div>
		<Button type="submit">Save</Button>
	</form>
{/if}

<article class="space-y-3">
	{#if data.blocks.length === 0}
		<p class="text-sm text-muted-foreground">Empty page. Add a block below.</p>
	{/if}
	{#each data.blocks as b (b.id)}
		<div class="group relative rounded-md border p-3">
			<form method="POST" action="?/updateBlock" use:enhance id={`block-save-${b.id}`}>
				<input type="hidden" name="id" value={b.id} />
				<input type="hidden" name="content" value={JSON.stringify(drafts[b.id] ?? b.content)} />
				<BlockComponent
					block={b}
					edit={data.canEdit}
					onchange={(c) => (drafts = { ...drafts, [b.id]: c })}
				/>
			</form>

			{#if data.canEdit}
				<div
					class="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<Button type="submit" form={`block-save-${b.id}`} variant="outline" size="xs">
						Save
					</Button>
					<form method="POST" action="?/moveBlock" use:enhance>
						<input type="hidden" name="id" value={b.id} />
						<input type="hidden" name="direction" value="up" />
						<Button type="submit" variant="ghost" size="icon-xs" aria-label="Move up">
							<ArrowUp class="size-3" />
						</Button>
					</form>
					<form method="POST" action="?/moveBlock" use:enhance>
						<input type="hidden" name="id" value={b.id} />
						<input type="hidden" name="direction" value="down" />
						<Button type="submit" variant="ghost" size="icon-xs" aria-label="Move down">
							<ArrowDown class="size-3" />
						</Button>
					</form>
					<form method="POST" action="?/deleteBlock" use:enhance>
						<input type="hidden" name="id" value={b.id} />
						<Button type="submit" variant="ghost" size="icon-xs" aria-label="Delete">
							<Trash2 class="size-3" />
						</Button>
					</form>
				</div>
			{/if}
		</div>
	{/each}
</article>

{#if data.canEdit}
	<Card.Root>
		<form method="POST" action="?/addBlock" use:enhance>
			<Card.Content class="grid gap-3 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
				<div class="space-y-1">
					<Label>Add block</Label>
					<select
						name="type"
						bind:value={addingType}
						class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
					>
						{#each BLOCK_TYPES as t (t)}
							<option value={t}>{BLOCK_LABELS[t]}</option>
						{/each}
					</select>
				</div>
				<Button type="submit">
					<Plus class="size-4" />
					<span>Add</span>
				</Button>
			</Card.Content>
		</form>
	</Card.Root>
{/if}

{#if data.children.length > 0}
	<section class="space-y-2">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Sub-pages</h2>
		<ul class="divide-y divide-border rounded-md border">
			{#each data.children as c (c.id)}
				<li>
					<a
						href={`/pages/${c.id}`}
						class="flex items-center gap-2 p-3 text-sm transition-colors hover:bg-muted/30"
					>
						<span class="w-5">{c.icon ?? '📄'}</span>
						<span class="flex-1">{c.title}</span>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
