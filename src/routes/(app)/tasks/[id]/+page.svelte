<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { AttrsEditor } from '$lib/custom-attrs';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.task.custom as object) });
	let submitting = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<section class="mx-auto max-w-2xl space-y-4">
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
					<Input
						id="title"
						name="title"
						value={data.task.title}
						required
						disabled={!data.canEdit}
					/>
				</div>

				<div class="grid gap-4 sm:grid-cols-3">
					<div class="space-y-2">
						<Label for="status">Status</Label>
						<select
							id="status"
							name="status"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
							disabled={!data.canEdit}
						>
							{#each ['todo', 'doing', 'done', 'cancelled'] as s (s)}
								<option value={s} selected={data.task.status === s}>{s}</option>
							{/each}
						</select>
					</div>
					<div class="space-y-2">
						<Label for="due_date">Due</Label>
						<Input
							id="due_date"
							name="due_date"
							type="date"
							value={data.task.due_date ?? ''}
							disabled={!data.canEdit}
						/>
					</div>
					<div class="space-y-2">
						<Label for="priority">Priority (1–5)</Label>
						<Input
							id="priority"
							name="priority"
							type="number"
							min={1}
							max={5}
							value={data.task.priority ?? ''}
							disabled={!data.canEdit}
						/>
					</div>
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						name="description"
						rows={6}
						value={data.task.description ?? ''}
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
				<Button type="button" variant="ghost" href="/tasks">Back</Button>
			</Card.Footer>
		</form>
	</Card.Root>
</section>
