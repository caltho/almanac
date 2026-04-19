<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Badge } from '$lib/components/ui/badge';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let { data, form } = $props();

	let editingId = $state<string | null>(null);
	let rulesForId = $state<string | null>(null);

	const childrenOf = $derived((parent: string | null) =>
		data.categories.filter((c) => c.parent_id === parent)
	);

	const roots = $derived(childrenOf(null));

	function rulesJson(rules: unknown): string {
		return JSON.stringify(rules ?? [], null, 2);
	}
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Categories</h2>
		<p class="text-sm text-muted-foreground">Tree of categories + auto-categorisation rules.</p>
	</div>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New category</Card.Title>
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
				<Label for="name">Name</Label>
				<Input id="name" name="name" required />
			</div>
			<div class="space-y-2">
				<Label for="parent_id">Parent</Label>
				<select
					id="parent_id"
					name="parent_id"
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">— top level —</option>
					{#each data.categories as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label for="color">Color</Label>
				<Input id="color" name="color" type="color" value="#71717B" class="h-9 w-16" />
			</div>
			<Button type="submit">Add</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if data.categories.length === 0}
	<p class="text-sm text-muted-foreground">No categories yet.</p>
{:else}
	{@render tree(roots, 0)}
{/if}

{#snippet tree(items: typeof data.categories, depth: number)}
	<ul class="space-y-2">
		{#each items as c (c.id)}
			<li class="rounded-md border">
				<div class="flex items-start gap-3 p-3">
					<div class="flex min-w-0 flex-1 items-center gap-2">
						{#if depth > 0}<ChevronRight class="size-4 shrink-0 text-muted-foreground" />{/if}
						{#if c.color}
							<span
								class="inline-block size-3 shrink-0 rounded-full"
								style={`background:${c.color}`}
							></span>
						{/if}
						<span class="font-medium">{c.name}</span>
						{#if Array.isArray(c.rules) && c.rules.length > 0}
							<Badge variant="outline" class="text-[10px]"
								>{c.rules.length} rule{c.rules.length > 1 ? 's' : ''}</Badge
							>
						{/if}
					</div>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onclick={() => (editingId = editingId === c.id ? null : c.id)}
					>
						{editingId === c.id ? 'Close' : 'Edit'}
					</Button>
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onclick={() => (rulesForId = rulesForId === c.id ? null : c.id)}
					>
						{rulesForId === c.id ? 'Hide rules' : 'Rules'}
					</Button>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={c.id} />
						<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
							<Trash2 class="size-4" />
						</Button>
					</form>
				</div>

				{#if editingId === c.id}
					<form
						method="POST"
						action="?/update"
						class="border-t p-3"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								editingId = null;
							}}
					>
						<input type="hidden" name="id" value={c.id} />
						<div class="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
							<div class="space-y-2">
								<Label>Name</Label>
								<Input name="name" value={c.name} required />
							</div>
							<div class="space-y-2">
								<Label>Parent</Label>
								<select
									name="parent_id"
									class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
								>
									<option value="">— top level —</option>
									{#each data.categories.filter((o) => o.id !== c.id) as o (o.id)}
										<option value={o.id} selected={c.parent_id === o.id}>{o.name}</option>
									{/each}
								</select>
							</div>
							<div class="space-y-2">
								<Label>Color</Label>
								<Input name="color" type="color" value={c.color ?? '#71717B'} class="h-9 w-16" />
							</div>
							<Button type="submit">Save</Button>
						</div>
					</form>
				{/if}

				{#if rulesForId === c.id}
					<form
						method="POST"
						action="?/updateRules"
						class="border-t p-3"
						use:enhance={() =>
							async ({ update }) =>
								await update()}
					>
						<input type="hidden" name="id" value={c.id} />
						<div class="space-y-2">
							<Label>Rules (JSON array)</Label>
							<Textarea
								name="rules"
								rows={5}
								class="font-mono text-xs"
								value={rulesJson(c.rules)}
							/>
							<p class="text-xs text-muted-foreground">
								Each entry: <code
									>{`{"kind":"keyword"|"regex","pattern":"...","case_sensitive":false}`}</code
								>
							</p>
							<div class="flex items-center gap-2">
								<Button type="submit" size="sm">Save rules</Button>
								{#if form && 'rulesSaved' in form && form.rulesSaved}
									<span class="text-xs text-emerald-600">Saved.</span>
								{/if}
							</div>
						</div>
					</form>
				{/if}

				{#if childrenOf(c.id).length > 0}
					<div class="border-t p-3 pl-6">
						{@render tree(childrenOf(c.id), depth + 1)}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}
