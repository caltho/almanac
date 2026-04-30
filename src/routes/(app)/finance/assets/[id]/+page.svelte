<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { AttrsEditor } from '$lib/custom-attrs';
	import BackButton from '$lib/components/BackButton.svelte';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let name = $state(data.asset.name);
	// svelte-ignore state_referenced_locally
	let kind = $state(data.asset.kind);
	// svelte-ignore state_referenced_locally
	let value = $state<number | string>(data.asset.value ?? '');
	// svelte-ignore state_referenced_locally
	let location = $state(data.asset.location ?? '');
	// svelte-ignore state_referenced_locally
	let tagsStr = $state((data.asset.tags ?? []).join(', '));
	// svelte-ignore state_referenced_locally
	let notes = $state(data.asset.notes ?? '');
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.asset.custom as object) });

	let submitting = $state(false);

	const ASSET_KINDS = ['cash', 'investment', 'property', 'vehicle', 'possession', 'other'] as const;

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<div class="flex items-center gap-2">
		<BackButton href="/finance/assets" />
		<span class="text-xs tracking-widest text-muted-foreground uppercase">Stuff</span>
	</div>

	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Edit asset</h1>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/archive"
				use:enhance={({ cancel }) => {
					if (!confirm('Archive this asset?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Archive</Button>
			</form>
		{/if}
	</header>

	<Card.Root>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
		>
			<Card.Content class="space-y-4 pt-6">
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="name">Name</Label>
						<Input id="name" name="name" bind:value={name} required />
					</div>
					<div class="space-y-2">
						<Label for="kind">Kind</Label>
						<select
							id="kind"
							name="kind"
							bind:value={kind}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
						>
							{#each ASSET_KINDS as k (k)}
								<option value={k}>{k}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<Label for="value">Value</Label>
						<Input id="value" name="value" type="number" step="0.01" bind:value />
					</div>
					<div class="space-y-2">
						<Label for="location">Location</Label>
						<Input id="location" name="location" bind:value={location} />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="tags">Tags (comma-separated)</Label>
					<Input id="tags" name="tags" bind:value={tagsStr} />
				</div>
				<div class="space-y-2">
					<Label for="notes">Notes</Label>
					<Textarea id="notes" name="notes" rows={4} bind:value={notes} />
				</div>

				<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form && 'saved' in form && form.saved}
					<p class="text-sm text-emerald-600">Saved.</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save changes'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
