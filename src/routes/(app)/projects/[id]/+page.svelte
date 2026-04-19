<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { AttrsEditor } from '$lib/custom-attrs';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();

	// svelte-ignore state_referenced_locally
	let values = $state<Record<string, unknown>>({ ...(data.project.custom as object) });
	let editing = $state(false);
	let submitting = $state(false);
	let adding = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);
</script>

<header class="flex items-start justify-between">
	<div class="min-w-0 space-y-1">
		<div class="flex items-center gap-2">
			{#if data.project.color}
				<span class="size-3 rounded-full" style={`background:${data.project.color}`}></span>
			{/if}
			<h1 class="text-2xl font-semibold tracking-tight">{data.project.name}</h1>
			<Badge variant="secondary" class="capitalize">{data.project.status}</Badge>
		</div>
		{#if data.project.description}
			<p class="text-sm text-muted-foreground">{data.project.description}</p>
		{/if}
	</div>
	<div class="flex gap-2">
		{#if data.canEdit}
			<Button variant="outline" size="sm" onclick={() => (editing = !editing)}>
				{editing ? 'Close' : 'Edit'}
			</Button>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm('Delete project + all items?')) cancel();
					return async ({ update }) => await update();
				}}
			>
				<Button type="submit" variant="ghost" size="sm">Delete</Button>
			</form>
		{/if}
		<Button variant="ghost" size="sm" href="/projects">Back</Button>
	</div>
</header>

{#if editing}
	<Card.Root>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
					editing = false;
				};
			}}
		>
			<Card.Content class="space-y-4 pt-6">
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="space-y-2 sm:col-span-2">
						<Label>Name</Label>
						<Input name="name" value={data.project.name} required />
					</div>
					<div class="space-y-2">
						<Label>Status</Label>
						<select
							name="status"
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
						>
							{#each ['active', 'done', 'archived'] as s (s)}
								<option value={s} selected={data.project.status === s}>{s}</option>
							{/each}
						</select>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Description</Label>
					<Textarea name="description" rows={3} value={data.project.description ?? ''} />
				</div>
				<div class="space-y-2">
					<Label>Color</Label>
					<Input
						name="color"
						type="color"
						value={data.project.color ?? '#71717B'}
						class="h-9 w-16"
					/>
				</div>

				<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />

				{#if form?.error}
					<p class="text-sm text-destructive">{form.error}</p>
				{/if}
			</Card.Content>
			<Card.Footer class="gap-2">
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save'}
				</Button>
				<Button type="button" variant="ghost" onclick={() => (editing = false)}>Cancel</Button>
			</Card.Footer>
		</form>
	</Card.Root>
{/if}

<section class="space-y-3">
	<h2 class="text-sm font-semibold tracking-widest uppercase">Checklist</h2>
	<form
		method="POST"
		action="?/addItem"
		use:enhance={() => {
			adding = true;
			return async ({ update }) => {
				await update({ reset: true });
				adding = false;
			};
		}}
		class="flex gap-2"
	>
		<Input name="title" placeholder="Add an item…" required class="flex-1" />
		<Button type="submit" disabled={adding}>Add</Button>
	</form>

	{#if data.items.length > 0}
		<ul class="divide-y divide-border rounded-md border">
			{#each data.items as i (i.id)}
				<li class="flex items-center gap-3 p-3 text-sm">
					<form method="POST" action="?/toggleItem" class="shrink-0" use:enhance>
						<input type="hidden" name="id" value={i.id} />
						<input type="hidden" name="done" value={i.done_at ? '' : 'on'} />
						<button
							type="submit"
							class={`grid size-4 place-items-center rounded border ${
								i.done_at ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
							}`}
							aria-label="Toggle done"
						>
							{#if i.done_at}✓{/if}
						</button>
					</form>
					<span class={`flex-1 ${i.done_at ? 'line-through opacity-60' : ''}`}>
						{i.title}
					</span>
					<form method="POST" action="?/deleteItem" use:enhance>
						<input type="hidden" name="id" value={i.id} />
						<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
							<Trash2 class="size-4" />
						</Button>
					</form>
				</li>
			{/each}
		</ul>
	{/if}
</section>

{#if data.subprojects.length > 0}
	<section class="space-y-3">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Sub-projects</h2>
		<ul class="divide-y divide-border rounded-md border">
			{#each data.subprojects as p (p.id)}
				<li>
					<a
						href={`/projects/${p.id}`}
						class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
					>
						{#if p.color}
							<span class="size-2.5 rounded-full" style={`background:${p.color}`}></span>
						{/if}
						<span class="flex-1">{p.name}</span>
						<Badge variant="secondary" class="text-[10px] capitalize">{p.status}</Badge>
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

{#if data.tasks.length > 0}
	<section class="space-y-3">
		<h2 class="text-sm font-semibold tracking-widest uppercase">Linked tasks</h2>
		<ul class="divide-y divide-border rounded-md border">
			{#each data.tasks as t (t.id)}
				<li>
					<a
						href={`/tasks/${t.id}`}
						class="flex items-center gap-3 p-3 text-sm transition-colors hover:bg-muted/30"
					>
						<span class="flex-1">{t.title}</span>
						<Badge variant="outline" class="text-[10px] capitalize">{t.status}</Badge>
						{#if t.due_date}
							<Badge variant="secondary" class="text-[10px]">{t.due_date}</Badge>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}
