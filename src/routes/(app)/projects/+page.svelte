<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data, form } = $props();

	const childrenOf = $derived((parent: string | null) =>
		data.projects.filter((p) => p.parent_id === parent)
	);
	const roots = $derived(childrenOf(null));
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
		<p class="text-sm text-muted-foreground">Nestable projects with checklist items.</p>
	</div>
	<Button variant="outline" size="sm" href="/projects/fields">
		<Settings2 class="size-4" />
		<span>Fields</span>
	</Button>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New project</Card.Title>
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
				<Label>Name</Label>
				<Input name="name" required />
			</div>
			<div class="space-y-2">
				<Label>Parent</Label>
				<select
					name="parent_id"
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">— top level —</option>
					{#each data.projects as p (p.id)}
						<option value={p.id}>{p.name}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label>Color</Label>
				<Input name="color" type="color" value="#71717B" class="h-9 w-16" />
			</div>
			<Button type="submit">Add</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if data.projects.length === 0}
	<p class="text-sm text-muted-foreground">No projects yet.</p>
{:else}
	{@render tree(roots, 0)}
{/if}

{#snippet tree(items: typeof data.projects, depth: number)}
	<ul class="space-y-2">
		{#each items as p (p.id)}
			{@const s = data.stats[p.id] ?? { total: 0, done: 0 }}
			<li class="rounded-md border">
				<a
					href={`/projects/${p.id}`}
					class="flex items-center gap-3 p-3 transition-colors hover:bg-muted/30"
				>
					{#if depth > 0}<ChevronRight class="size-4 text-muted-foreground" />{/if}
					{#if p.color}
						<span class="size-3 shrink-0 rounded-full" style={`background:${p.color}`}></span>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="font-medium">{p.name}</div>
						{#if p.description}
							<p class="line-clamp-1 text-xs text-muted-foreground">{p.description}</p>
						{/if}
					</div>
					<Badge variant="secondary" class="text-[10px] capitalize">{p.status}</Badge>
					{#if s.total > 0}
						<Badge variant="outline" class="text-[10px]">{s.done}/{s.total}</Badge>
					{/if}
				</a>
				{#if childrenOf(p.id).length > 0}
					<div class="border-t p-3 pl-6">
						{@render tree(childrenOf(p.id), depth + 1)}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}
