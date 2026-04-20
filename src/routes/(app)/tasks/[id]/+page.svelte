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
	let title = $state(data.task.title);
	// svelte-ignore state_referenced_locally
	let status = $state(data.task.status);
	// svelte-ignore state_referenced_locally
	let dueDate = $state(data.task.due_date ?? '');
	// svelte-ignore state_referenced_locally
	let priority = $state<number | string>(data.task.priority ?? '');
	// svelte-ignore state_referenced_locally
	let description = $state(data.task.description ?? '');
	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.task.custom as object) });

	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
	<div class="flex items-center gap-2">
		<BackButton href="/tasks" />
		<span class="text-xs tracking-widest text-muted-foreground uppercase">Tasks</span>
	</div>

	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-semibold tracking-tight">Edit task</h1>
		{#if data.canEdit}
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete this task?')) cancel();
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
					<Label for="title">Title</Label>
					<Input id="title" name="title" bind:value={title} required />
				</div>

				<div class="grid gap-4 sm:grid-cols-3">
					<div class="space-y-2">
						<Label for="status">Status</Label>
						<select
							id="status"
							name="status"
							bind:value={status}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
						>
							{#each ['todo', 'doing', 'done', 'cancelled'] as s (s)}
								<option value={s}>{s}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<Label for="due_date">Due</Label>
						<Input id="due_date" name="due_date" type="date" bind:value={dueDate} />
					</div>
					<div class="space-y-2">
						<Label for="priority">Priority (1–5)</Label>
						<Input
							id="priority"
							name="priority"
							type="number"
							min={1}
							max={5}
							bind:value={priority}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea id="description" name="description" rows={6} bind:value={description} />
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
