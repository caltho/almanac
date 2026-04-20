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

	// Controlled inputs via bind:value so user typing isn't reset by re-renders
	// after form submit completes. Seeded once from data.
	// svelte-ignore state_referenced_locally
	let entryDate = $state(data.entry.entry_date);
	// svelte-ignore state_referenced_locally
	let title = $state(data.entry.title ?? '');
	// svelte-ignore state_referenced_locally
	let body = $state(data.entry.body ?? '');
	// svelte-ignore state_referenced_locally
	let mood = $state<number | string>(data.entry.mood ?? '');
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.entry.custom as object) });

	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<div class="flex items-center gap-2">
		<BackButton href="/journal" />
		<span class="text-xs tracking-widest text-muted-foreground uppercase">Journal</span>
	</div>

	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Edit entry</h1>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this entry?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Delete</Button>
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
						<Label for="entry_date">Date</Label>
						<Input id="entry_date" name="entry_date" type="date" bind:value={entryDate} required />
					</div>
					<div class="space-y-2">
						<Label for="mood">Mood (1–10)</Label>
						<Input id="mood" name="mood" type="number" min={1} max={10} bind:value={mood} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="title">Title</Label>
					<Input id="title" name="title" bind:value={title} />
				</div>

				<div class="space-y-2">
					<Label for="body">Body</Label>
					<Textarea id="body" name="body" rows={8} bind:value={body} />
				</div>

				<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form && 'saved' in form && form.saved}
					<p class="text-sm text-emerald-600">Saved.</p>
				{/if}
			</Card.Content>
			<Card.Footer class="flex-col items-stretch gap-2 pt-4 sm:flex-row sm:items-center sm:gap-3">
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save changes'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
