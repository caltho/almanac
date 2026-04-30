<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Database from '@lucide/svelte/icons/database';
	import { useUserData } from '$lib/stores/userData.svelte';
	import { asColumns } from '$lib/datasets';

	let { form } = $props();

	const userData = useUserData();
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Datasets</h1>
		<p class="text-sm text-muted-foreground">
			Tiny tables you design. A name column plus up to 7 of your own.
		</p>
	</div>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">New dataset</Card.Title>
	</Card.Header>
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update }) =>
				await update({ reset: true })}
	>
		<Card.Content class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
			<div class="space-y-2">
				<Label for="ds-name">Name</Label>
				<Input id="ds-name" name="name" placeholder="e.g. Books, Meals, Workouts…" required />
			</div>
			<Button type="submit">Create</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if userData.datasets.length === 0}
	<div class="rounded-md border p-8 text-center">
		<Database class="mx-auto mb-2 size-8 text-muted-foreground" />
		<p class="text-sm text-muted-foreground">No datasets yet. Create one above.</p>
	</div>
{:else}
	<ul class="grid gap-3 sm:grid-cols-2">
		{#each userData.datasets as d (d.id)}
			{@const cols = asColumns(d.columns)}
			<li>
				<a
					href={`/projects/datasets/${d.id}`}
					class="block rounded-md border p-4 transition-colors hover:bg-muted/30"
				>
					<div class="flex items-center gap-2">
						<Database class="size-4 text-muted-foreground" />
						<span class="font-medium">{d.name}</span>
						<Badge variant="secondary" class="ml-auto text-[10px]">
							{cols.length}
							{cols.length === 1 ? 'col' : 'cols'}
						</Badge>
					</div>
					{#if cols.length > 0}
						<div class="mt-2 flex flex-wrap gap-1">
							{#each cols as c (c.key)}
								<Badge variant="outline" class="text-[10px]">{c.label}</Badge>
							{/each}
						</div>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
