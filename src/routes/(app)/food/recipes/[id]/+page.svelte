<script lang="ts">
	// {@html} below renders recipe bodies and version snapshots — both written
	// through `sanitizeHtml` on the server, so the markup is allowlisted.
	/* eslint-disable svelte/no-at-html-tags */
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import History from '@lucide/svelte/icons/history';
	import Save from '@lucide/svelte/icons/save';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(data.recipe.name);
	// svelte-ignore state_referenced_locally
	let description = $state(data.recipe.description ?? '');
	// svelte-ignore state_referenced_locally
	let ingredients = $state(data.recipe.ingredients_html ?? '');
	// svelte-ignore state_referenced_locally
	let method = $state(data.recipe.method_html ?? '');
	let saving = $state(false);
	let snapshotting = $state(false);
	let snapshotNotes = $state('');
	let showHistory = $state(false);

	function fmtDate(d: string): string {
		const dt = new Date(d);
		const dd = String(dt.getDate()).padStart(2, '0');
		const mm = String(dt.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${dt.getFullYear()}`;
	}
</script>

<section class="space-y-6">
	<div class="flex items-center justify-between gap-2">
		<div class="flex items-center gap-2">
			<BackButton href="/food/recipes" />
			<span class="text-xs tracking-widest text-muted-foreground uppercase">Recipes</span>
		</div>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this recipe and all versions?')) cancel();
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
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
		class="space-y-5"
	>
		<div class="grid gap-3 sm:grid-cols-[2fr_3fr] sm:items-end">
			<div class="space-y-1.5">
				<Label class="text-xs">Name</Label>
				<Input name="name" bind:value={name} required class="text-lg font-semibold" />
			</div>
			<div class="space-y-1.5">
				<Label class="text-xs">Description</Label>
				<Input name="description" bind:value={description} placeholder="One-line summary…" />
			</div>
		</div>

		<div class="grid gap-5 lg:grid-cols-2">
			<div class="space-y-1.5">
				<Label class="text-xs">Ingredients</Label>
				<RichTextEditor
					bind:value={ingredients}
					name="ingredients_html"
					placeholder="What's in it…"
					minHeight="14rem"
				/>
			</div>
			<div class="space-y-1.5">
				<Label class="text-xs">Method</Label>
				<RichTextEditor
					bind:value={method}
					name="method_html"
					placeholder="How to make it…"
					minHeight="14rem"
				/>
			</div>
		</div>

		<div class="flex items-center justify-between">
			<div>
				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form && 'saved' in form && form.saved}
					<p class="text-sm text-emerald-600">Saved.</p>
				{:else if form && 'snapshotted' in form && form.snapshotted}
					<p class="text-sm text-emerald-600">Iteration saved.</p>
				{/if}
			</div>
			<Button type="submit" disabled={saving}>
				<Save class="size-4" />
				{saving ? 'Saving…' : 'Save changes'}
			</Button>
		</div>
	</form>

	<!-- Snapshot iteration form -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-base">
				<History class="size-4" />
				Save an iteration
			</Card.Title>
			<Card.Description>
				Capture the current ingredients + method as a version, with a note about how it turned out.
				The current state stays editable.
			</Card.Description>
		</Card.Header>
		<form
			method="POST"
			action="?/saveVersion"
			use:enhance={() => {
				snapshotting = true;
				return async ({ update }) => {
					await update({ reset: true });
					snapshotting = false;
					snapshotNotes = '';
				};
			}}
		>
			<Card.Content class="space-y-3">
				<Textarea
					name="notes"
					bind:value={snapshotNotes}
					rows={2}
					placeholder="How did this version turn out?"
				/>
			</Card.Content>
			<Card.Footer>
				<Button type="submit" variant="outline" disabled={snapshotting}>
					{snapshotting ? 'Saving…' : 'Save iteration'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>

	<!-- Version history -->
	{#if data.versions.length > 0}
		<section class="space-y-3">
			<div class="flex items-center justify-between">
				<h2
					class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
				>
					<History class="size-3.5" />
					Iterations · {data.versions.length}
				</h2>
				<Button size="sm" variant="ghost" onclick={() => (showHistory = !showHistory)}>
					{showHistory ? 'Hide details' : 'Show details'}
				</Button>
			</div>
			<ul class="space-y-3">
				{#each data.versions as v (v.id)}
					<li class="rounded-lg border bg-card">
						<div class="flex items-start justify-between gap-3 px-4 py-3">
							<div class="min-w-0 space-y-1">
								<div class="text-xs tracking-wider text-muted-foreground uppercase">
									{fmtDate(v.created_at)}
								</div>
								{#if v.notes}
									<p class="text-sm">{v.notes}</p>
								{:else}
									<p class="text-xs text-muted-foreground italic">No notes</p>
								{/if}
							</div>
							<form method="POST" action="?/deleteVersion" use:enhance>
								<input type="hidden" name="id" value={v.id} />
								<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete iteration">
									<Trash2 class="size-4" />
								</Button>
							</form>
						</div>
						{#if showHistory}
							<div class="grid gap-4 border-t border-border/60 px-4 py-3 lg:grid-cols-2">
								<div class="space-y-1.5">
									<div class="text-[10px] tracking-widest text-muted-foreground uppercase">
										Ingredients
									</div>
									<div class="prose prose-sm max-w-none dark:prose-invert">
										{@html v.ingredients_html}
									</div>
								</div>
								<div class="space-y-1.5">
									<div class="text-[10px] tracking-widest text-muted-foreground uppercase">
										Method
									</div>
									<div class="prose prose-sm max-w-none dark:prose-invert">
										{@html v.method_html}
									</div>
								</div>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</section>
