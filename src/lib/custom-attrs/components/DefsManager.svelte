<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Plus from '@lucide/svelte/icons/plus';
	import { ATTR_TYPES, ATTR_TYPE_LABELS } from '../types';
	import type { CustomAttrDef } from '../types';

	let {
		defs,
		tableName,
		actionPrefix = ''
	}: {
		defs: CustomAttrDef[];
		tableName: string;
		actionPrefix?: string;
	} = $props();

	let adding = $state(false);
	let newType = $state<(typeof ATTR_TYPES)[number]>('text');

	const needsOptions = $derived(newType === 'select' || newType === 'multiselect');
	const needsMax = $derived(newType === 'rating');
</script>

<div class="space-y-4">
	{#if defs.length > 0}
		<ul class="divide-y divide-border rounded-md border">
			{#each defs as d (d.id)}
				<li class="flex items-center justify-between gap-3 p-3 text-sm">
					<div class="space-y-1">
						<div class="font-medium">{d.label}</div>
						<div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
							<code class="rounded bg-muted px-1">{d.key}</code>
							<Badge variant="outline" class="text-[10px] uppercase">{d.type}</Badge>
							{#if d.required}<Badge variant="secondary" class="text-[10px]">required</Badge>{/if}
						</div>
					</div>
					<form method="POST" action="{actionPrefix}?/deleteDef" use:enhance>
						<input type="hidden" name="id" value={d.id} />
						<Button type="submit" variant="ghost" size="sm" aria-label="Delete field">
							<Trash2 class="size-4" />
						</Button>
					</form>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-sm text-muted-foreground">No custom fields yet.</p>
	{/if}

	{#if !adding}
		<Button variant="outline" size="sm" onclick={() => (adding = true)}>
			<Plus class="size-4" />
			<span>Add field</span>
		</Button>
	{:else}
		<Card.Root>
			<form
				method="POST"
				action="{actionPrefix}?/addDef"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: true });
						adding = false;
					}}
			>
				<input type="hidden" name="table_name" value={tableName} />
				<Card.Content class="grid gap-4 pt-6 sm:grid-cols-2">
					<div class="space-y-2">
						<Label for="label">Label</Label>
						<Input id="label" name="label" required placeholder="e.g. Energy level" />
					</div>
					<div class="space-y-2">
						<Label for="key">Key</Label>
						<Input
							id="key"
							name="key"
							required
							pattern="[a-z][a-z0-9_]*"
							placeholder="energy_level"
						/>
						<p class="text-xs text-muted-foreground">snake_case, stored as jsonb property.</p>
					</div>
					<div class="space-y-2">
						<Label for="type">Type</Label>
						<select
							id="type"
							name="type"
							bind:value={newType}
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
						>
							{#each ATTR_TYPES as t (t)}
								<option value={t}>{ATTR_TYPE_LABELS[t]}</option>
							{/each}
						</select>
					</div>
					<div class="flex items-end gap-3 pb-1">
						<label class="flex items-center gap-2 text-sm">
							<input type="checkbox" name="required" value="on" class="size-4 accent-foreground" />
							<span>Required</span>
						</label>
					</div>

					{#if needsOptions}
						<div class="space-y-2 sm:col-span-2">
							<Label for="options">Options (comma-separated)</Label>
							<Input id="options" name="options" placeholder="low, medium, high" required />
						</div>
					{/if}
					{#if needsMax}
						<div class="space-y-2">
							<Label for="max">Maximum</Label>
							<Input id="max" name="max" type="number" min="2" max="10" value="5" />
						</div>
					{/if}
				</Card.Content>
				<Card.Footer class="gap-2">
					<Button type="submit">Add field</Button>
					<Button type="button" variant="ghost" onclick={() => (adding = false)}>Cancel</Button>
				</Card.Footer>
			</form>
		</Card.Root>
	{/if}
</div>
