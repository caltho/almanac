<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { AttrsEditor, AttrsRenderer } from '$lib/custom-attrs';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { form } = $props();

	import { localIso } from '$lib/dates';

	const userData = useUserData();
	const defs = $derived(userData.defsFor('sleep_logs'));

	let values = $state<Record<string, unknown>>({});
	let submitting = $state(false);
	const today = localIso();

	let wentToBed = $state('');
	let wokeUp = $state('');
	let hoursSlept = $state<number | string>('');
	let userTouchedHours = $state(false);

	const fieldErrors = $derived(
		(form && 'fieldErrors' in form ? (form.fieldErrors as Record<string, string>) : {}) ?? {}
	);

	function fmt(d: string) {
		const dt = new Date(d + 'T00:00:00');
		const dd = String(dt.getDate()).padStart(2, '0');
		const mm = String(dt.getMonth() + 1).padStart(2, '0');
		return `${dd}/${mm}/${dt.getFullYear()}`;
	}

	/** Auto-compute hours between two HH:MM strings, assuming bed→wake crosses
	 *  at most one midnight. Returns a number rounded to 0.25. */
	function diffHours(bed: string, wake: string): number | null {
		if (!/^\d{2}:\d{2}$/.test(bed) || !/^\d{2}:\d{2}$/.test(wake)) return null;
		const [bh, bm] = bed.split(':').map(Number);
		const [wh, wm] = wake.split(':').map(Number);
		let mins = wh * 60 + wm - (bh * 60 + bm);
		if (mins <= 0) mins += 24 * 60; // crossed midnight
		return Math.round((mins / 60) * 4) / 4;
	}

	// Recompute hours whenever either time changes, unless the user has typed
	// into the hours field directly (respect their override).
	$effect(() => {
		if (userTouchedHours) return;
		const v = diffHours(wentToBed, wokeUp);
		hoursSlept = v ?? '';
	});

	function resetForm() {
		wentToBed = '';
		wokeUp = '';
		hoursSlept = '';
		userTouchedHours = false;
		values = {};
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Sleep</h1>
			<p class="text-sm text-muted-foreground">
				One row per night. Hours auto-calculate from bed/wake times.
			</p>
		</div>
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
				return async ({ update, result }) => {
					await update({ reset: true });
					if (result.type === 'success') resetForm();
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
					<Input id="went_to_bed" name="went_to_bed" type="time" bind:value={wentToBed} />
				</div>
				<div class="space-y-2">
					<Label for="woke_up">Woke up</Label>
					<Input id="woke_up" name="woke_up" type="time" bind:value={wokeUp} />
				</div>
				<div class="space-y-2">
					<Label for="hours_slept">Hours slept</Label>
					<Input
						id="hours_slept"
						name="hours_slept"
						type="number"
						step="0.25"
						min="0"
						max="24"
						bind:value={hoursSlept}
						oninput={() => (userTouchedHours = true)}
					/>
				</div>
				<div class="space-y-2">
					<Label for="quality">Quality (1–10)</Label>
					<Input id="quality" name="quality" type="number" min={1} max={10} />
				</div>
				<div class="space-y-2 sm:col-span-2 lg:col-span-3">
					<Label for="notes">Notes</Label>
					<Textarea id="notes" name="notes" rows={2} />
				</div>

				{#if defs.length > 0}
					<div class="sm:col-span-2 lg:col-span-3">
						<AttrsEditor {defs} bind:values errors={fieldErrors} />
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

	{#if userData.sleepLogs.length === 0}
		<p class="text-sm text-muted-foreground">No nights logged yet.</p>
	{:else}
		<ul class="divide-y divide-border rounded-md border">
			{#each userData.sleepLogs as log (log.id)}
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
					<AttrsRenderer {defs} values={log.custom as Record<string, unknown>} />
				</li>
			{/each}
		</ul>
	{/if}
</section>
