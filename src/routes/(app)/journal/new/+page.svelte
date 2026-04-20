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

	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);
	const today = new Date().toISOString().slice(0, 10);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<div class="flex items-center gap-2">
		<BackButton href="/journal" />
		<span class="text-xs tracking-widest text-muted-foreground uppercase">Journal</span>
	</div>

	<header class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">New entry</h1>
	</header>

	<Card.Root>
		<form
			method="POST"
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
						<Input id="entry_date" name="entry_date" type="date" value={today} required />
					</div>
					<div class="space-y-2">
						<Label for="mood">Mood (1–10)</Label>
						<Input id="mood" name="mood" type="number" min={1} max={10} />
					</div>
				</div>

				<div class="space-y-2">
					<Label for="title">Title</Label>
					<Input id="title" name="title" />
				</div>

				<div class="space-y-2">
					<Label for="body">Body</Label>
					<Textarea id="body" name="body" rows={8} />
				</div>

				<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
