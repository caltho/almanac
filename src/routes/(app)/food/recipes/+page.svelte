<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import UtensilsCrossed from '@lucide/svelte/icons/utensils-crossed';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();
	let showNew = $state(false);
	let creating = $state(false);

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
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Recipes</h2>
		<p class="text-sm text-muted-foreground">
			Your evolving recipe book. Tweak ingredients, snapshot iterations, comment on how each turned
			out.
		</p>
	</div>
	<Button size="sm" onclick={() => (showNew = !showNew)}>
		<Plus class="size-4" />
		<span>{showNew ? 'Close' : 'New recipe'}</span>
	</Button>
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
			<li>
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
			</li>
		{/each}
	</ul>
{/if}
