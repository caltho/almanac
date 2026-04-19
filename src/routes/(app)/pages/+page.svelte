<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import FileText from '@lucide/svelte/icons/file-text';

	let { data, form } = $props();

	const childrenOf = $derived((parent: string | null) =>
		data.pages.filter((p) => p.parent_id === parent)
	);
	const roots = $derived(childrenOf(null));
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Pages</h1>
		<p class="text-sm text-muted-foreground">Nestable docs made from typed blocks.</p>
	</div>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New page</Card.Title>
	</Card.Header>
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update }) =>
				await update({ reset: true })}
	>
		<Card.Content class="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
			<div class="space-y-2">
				<Label>Title</Label>
				<Input name="title" placeholder="Untitled" />
			</div>
			<div class="space-y-2">
				<Label>Parent</Label>
				<select
					name="parent_id"
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">— top level —</option>
					{#each data.pages as p (p.id)}
						<option value={p.id}>{p.title}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label>Icon</Label>
				<Input name="icon" placeholder="📝" class="w-20" maxlength={4} />
			</div>
			<Button type="submit">Create</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if data.pages.length === 0}
	<p class="text-sm text-muted-foreground">No pages yet.</p>
{:else}
	{@render tree(roots, 0)}
{/if}

{#snippet tree(items: typeof data.pages, depth: number)}
	<ul class="space-y-1">
		{#each items as p (p.id)}
			<li>
				<a
					href={`/pages/${p.id}`}
					class="flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted/30"
					style={`padding-left:${depth * 16 + 8}px`}
				>
					<span class="w-5 shrink-0">{p.icon ?? ''}</span>
					{#if !p.icon}
						<FileText class="size-4 text-muted-foreground" />
					{/if}
					<span class="flex-1 truncate">{p.title}</span>
				</a>
				{#if childrenOf(p.id).length > 0}
					{@render tree(childrenOf(p.id), depth + 1)}
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}
