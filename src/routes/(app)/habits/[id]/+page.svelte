<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsEditor } from '$lib/custom-attrs';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.habit.custom as object) });
	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<header class="flex items-center justify-between">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">{data.habit.name}</h1>
			<div class="flex gap-2">
				<Badge variant="secondary">{data.habit.cadence}</Badge>
				<Badge variant="outline">🔥 {data.streak}-day streak</Badge>
				<Badge variant="outline">{data.checks.length} total ticks</Badge>
			</div>
		</div>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete habit and all its ticks?')) cancel();
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
				<div class="space-y-2">
					<Label for="name">Name</Label>
					<Input id="name" name="name" value={data.habit.name} required disabled={!data.canEdit} />
				</div>
				<div class="space-y-2">
					<Label for="cadence">Cadence</Label>
					<Input id="cadence" name="cadence" value={data.habit.cadence} disabled={!data.canEdit} />
				</div>
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						rows={3}
						value={data.habit.description ?? ''}
						disabled={!data.canEdit}
					/>
				</div>

				<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{:else if form && 'saved' in form && form.saved}
					<p class="text-sm text-emerald-600">Saved.</p>
				{/if}
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button type="submit" disabled={submitting || !data.canEdit}>
					{submitting ? 'Saving…' : 'Save changes'}
				</Button>
				<Button type="button" variant="ghost" href="/habits">Back</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
