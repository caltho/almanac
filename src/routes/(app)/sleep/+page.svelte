<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { AttrsEditor, AttrsRenderer } from '$lib/custom-attrs';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	let { data, form } = $props();

	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);
	const today = new Date().toISOString().slice(0, 10);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);

	function fmt(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Sleep</h1>
			<p class="text-sm text-muted-foreground">One row per night. Quality, hours, notes.</p>
		</div>
		<Button variant="outline" size="sm" href="/sleep/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-base">Log last night</Card.Title>
		</Card.Header>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update({ reset: true });
					values = {};
					submitting = false;
				};
			}}
		>
			<Card.Content class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div class="space-y-2">
					<Label for="log_date">Date</Label>
					<Input id="log_date" name="log_date" type="date" value={today} required />
				</div>
				<div class="space-y-2">
					<Label for="went_to_bed">Went to bed</Label>
					<Input id="went_to_bed" name="went_to_bed" type="time" />
				</div>
				<div class="space-y-2">
					<Label for="woke_up">Woke up</Label>
					<Input id="woke_up" name="woke_up" type="time" />
				</div>
				<div class="space-y-2">
					<Label for="hours_slept">Hours slept</Label>
					<Input id="hours_slept" name="hours_slept" type="number" step="0.25" min="0" max="24" />
				</div>
				<div class="space-y-2">
					<Label for="quality">Quality (1–10)</Label>
					<Input id="quality" name="quality" type="number" min={1} max={10} />
				</div>
				<div class="space-y-2 sm:col-span-2 lg:col-span-3">
					<Label for="notes">Notes</Label>
					<Textarea id="notes" name="notes" rows={2} />
				</div>

				{#if data.defs.length > 0}
					<div class="sm:col-span-2 lg:col-span-3">
						<AttrsEditor defs={data.defs} bind:values errors={fieldErrors} />
					</div>
				{/if}

				{#if form?.error}
					<p class="text-sm text-destructive sm:col-span-2 lg:col-span-3">{form.error}</p>
				{/if}
			</Card.Content>
			<Card.Footer>
				<Button type="submit" disabled={submitting}>
					{submitting ? 'Saving…' : 'Save'}
				</Button>
			</Card.Footer>
		</form>
	</Card.Root>

	{#if data.logs.length === 0}
		<p class="text-sm text-muted-foreground">No nights logged yet.</p>
	{:else}
		<ul class="divide-y divide-border rounded-md border">
			{#each data.logs as log (log.id)}
				<li class="space-y-2 p-4 text-sm">
					<div class="flex flex-wrap items-center gap-3">
						<time class="text-xs tracking-widest text-muted-foreground uppercase"
							>{fmt(log.log_date)}</time
						>
						{#if typeof log.hours_slept === 'number'}
							<span class="font-medium">{log.hours_slept}h</span>
						{/if}
						{#if typeof log.quality === 'number'}
							<Badge variant="secondary" class="text-xs">Quality {log.quality}/10</Badge>
						{/if}
						{#if log.went_to_bed}
							<span class="text-xs text-muted-foreground">bed {log.went_to_bed.slice(0, 5)}</span>
						{/if}
						{#if log.woke_up}
							<span class="text-xs text-muted-foreground">woke {log.woke_up.slice(0, 5)}</span>
						{/if}
						<form method="POST" action="?/delete" class="ml-auto" use:enhance>
							<input type="hidden" name="id" value={log.id} />
							<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
								<Trash2 class="size-4" />
							</Button>
						</form>
					</div>
					{#if log.notes}<p class="whitespace-pre-wrap">{log.notes}</p>{/if}
					<AttrsRenderer defs={data.defs} values={log.custom as Record<string, unknown>} />
				</li>
			{/each}
		</ul>
	{/if}
</section>
