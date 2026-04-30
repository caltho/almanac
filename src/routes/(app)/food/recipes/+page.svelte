<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Plus from '@lucide/svelte/icons/plus';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import MoreVertical from '@lucide/svelte/icons/more-vertical';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useUserData, type Recipe } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();
	let showNew = $state(false);
	let creating = $state(false);
	let editing = $state(false);

	const recipes = $derived(userData.recipes.slice().sort((a, b) => a.name.localeCompare(b.name)));

	function preview(html: string): string {
		// Strip tags for the card preview — sanitization happens server-side, this
		// is just a display niceness so we don't render markup in a small blurb.
		return html
			.replace(/<[^>]+>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 140);
	}

	async function deleteRecipe(r: Recipe) {
		if (!confirm(`Delete "${r.name}"? This cannot be undone.`)) return;
		userData.removeRecipe(r.id);
		try {
			const fd = new FormData();
			fd.set('id', r.id);
			const res = await fetch('?/archive', { method: 'POST', body: fd });
			if (!res.ok) throw new Error();
		} catch {
			userData.addRecipe(r);
		}
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Recipes</h2>
		<p class="text-sm text-muted-foreground">
			Your evolving recipe book. Tweak ingredients, snapshot iterations, comment on how each turned
			out.
		</p>
	</div>
	<div class="flex items-center gap-1">
		{#if editing}
			<Button size="sm" onclick={() => (editing = false)}>
				<Check class="size-4" />
				Save
			</Button>
		{/if}
		<Button size="sm" onclick={() => (showNew = !showNew)}>
			<Plus class="size-4" />
			<span>{showNew ? 'Close' : 'New recipe'}</span>
		</Button>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="List actions"
					>
						<MoreVertical class="size-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-44">
				<DropdownMenu.Item onclick={() => (editing = !editing)}>
					<Pencil class="size-4" />
					<span>{editing ? 'Done editing' : 'Edit'}</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
</header>

{#if showNew}
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			creating = true;
			return async ({ update }) => {
				await update({ reset: true });
				creating = false;
			};
		}}
		class="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_auto] sm:items-end"
	>
		<Input name="name" placeholder="What's it called? (e.g. Chickpea curry)" required autofocus />
		<Button type="submit" disabled={creating}>{creating ? 'Creating…' : 'Create'}</Button>
		{#if form?.error}
			<p class="col-span-full text-sm text-destructive">{form.error}</p>
		{/if}
	</form>
{/if}

{#if recipes.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<UtensilsCrossed class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			Empty cookbook. <button class="underline" onclick={() => (showNew = true)}
				>Add a recipe</button
			>.
		</p>
	</div>
{:else}
	<ul class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each recipes as r (r.id)}
			<li class="relative">
				<a
					href={`/food/recipes/${r.id}`}
					class="block h-full rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20"
				>
					<h3 class="font-semibold tracking-tight">{r.name}</h3>
					{#if r.description}
						<p class="mt-1 text-xs text-muted-foreground">{r.description}</p>
					{/if}
					{#if r.ingredients_html}
						<p class="mt-3 line-clamp-3 text-xs text-muted-foreground">
							{preview(r.ingredients_html)}
						</p>
					{/if}
				</a>
				{#if editing}
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						class="absolute top-2 right-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
						aria-label="Delete recipe"
						onclick={() => deleteRecipe(r)}
					>
						<Trash2 class="size-4" />
					</Button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
