<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Activity from '@lucide/svelte/icons/activity';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ColorTrigger from '$lib/components/ColorTrigger.svelte';
	import DateScroller from '$lib/components/DateScroller.svelte';
	import { paletteHex, type PaletteToken } from '$lib/palette';
	import {
		useUserData,
		type Activity as ActivityRow,
		type ActivityLog
	} from '$lib/stores/userData.svelte';

	const userData = useUserData();

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIso = today.toISOString().slice(0, 10);

	let selectedIso = $state(todayIso);
	const isToday = $derived(selectedIso === todayIso);
	const selectedLabel = $derived.by(() => {
		const [y, m, d] = selectedIso.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	});

	let busy = $state<Record<string, boolean>>({});
	let burst = $state<Set<string>>(new Set());
	let newName = $state('');
	let showNew = $state(false);
	let editing = $state(false);

	function isLoggedOn(activity_id: string, dateIso: string): boolean {
		return userData.activityLogs.some(
			(l) => l.activity_id === activity_id && l.log_date === dateIso
		);
	}

	const sortedActivities = $derived(
		userData.activities
			.slice()
			.sort((a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name))
	);

	const due = $derived(sortedActivities.filter((a) => !isLoggedOn(a.id, selectedIso)));
	const done = $derived(sortedActivities.filter((a) => isLoggedOn(a.id, selectedIso)));
	const activityLogDates = $derived(new Set(userData.activityLogs.map((l) => l.log_date)));

	async function toggle(activity: ActivityRow) {
		const wasLogged = isLoggedOn(activity.id, selectedIso);
		const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
		userData.toggleActivityLog(activity.id, selectedIso, !wasLogged, tempId);

		if (!wasLogged) {
			burst = new Set([...burst, activity.id]);
			setTimeout(() => {
				burst.delete(activity.id);
				burst = new Set(burst);
			}, 800);
		}

		busy[activity.id] = true;
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'toggle',
					activity_id: activity.id,
					log_date: selectedIso,
					on: !wasLogged
				})
			});
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { log?: ActivityLog };
			if (body.log) userData.replaceActivityLog(tempId, body.log);
		} catch {
			userData.toggleActivityLog(activity.id, selectedIso, wasLogged);
		} finally {
			busy[activity.id] = false;
		}
	}

	async function createActivity(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		newName = '';
		showNew = false;
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'create', name })
			});
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { activity: ActivityRow };
			userData.addActivity(body.activity);
		} catch {
			newName = name;
		}
	}

	async function archive(activity: ActivityRow) {
		userData.removeActivity(activity.id);
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', id: activity.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.addActivity(activity);
		}
	}

	async function rename(activity: ActivityRow, name: string) {
		const trimmed = name.trim();
		if (!trimmed || trimmed === activity.name) return;
		const prev = activity.name;
		const i = userData.activities.findIndex((a) => a.id === activity.id);
		if (i >= 0) userData.activities[i] = { ...userData.activities[i], name: trimmed };
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'rename', id: activity.id, name: trimmed })
			});
			if (!res.ok) throw new Error();
		} catch {
			if (i >= 0) userData.activities[i] = { ...userData.activities[i], name: prev };
		}
	}

	async function setColor(activity: ActivityRow, color: PaletteToken | null) {
		const prev = activity.color;
		// Optimistic: patch the activity in-store. activities helper has no
		// `updateActivity`, so we splice manually.
		const i = userData.activities.findIndex((a) => a.id === activity.id);
		if (i >= 0) userData.activities[i] = { ...userData.activities[i], color };
		try {
			const res = await fetch('/tracking/activities/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setColor', id: activity.id, color })
			});
			if (!res.ok) throw new Error();
		} catch {
			if (i >= 0) userData.activities[i] = { ...userData.activities[i], color: prev };
		}
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Activities</h1>
		<p class="text-sm text-muted-foreground">
			{#if isToday}
				Tap what you did today — {selectedLabel}.
			{:else}
				Logging {selectedLabel}. Tap to backfill.
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-2">
		<Button size="sm" onclick={() => (showNew = !showNew)}>
			<Plus class="size-4" />
			<span>{showNew ? 'Close' : 'New'}</span>
		</Button>
		<Button
			size="sm"
			variant={editing ? 'default' : 'outline'}
			onclick={() => (editing = !editing)}
		>
			{#if editing}
				<Check class="size-4" />
				<span>Done</span>
			{:else}
				<Pencil class="size-4" />
				<span>Edit</span>
			{/if}
		</Button>
	</div>
</header>

<DateScroller
	selected={selectedIso}
	onchange={(iso) => (selectedIso = iso)}
	activeDates={activityLogDates}
/>

{#if showNew}
	<form
		onsubmit={createActivity}
		class="flex items-center gap-2 rounded-lg border bg-muted/20 p-2"
	>
		<Plus class="ml-2 size-4 text-muted-foreground" />
		<Input
			bind:value={newName}
			placeholder="New activity…"
			class="h-8 border-transparent bg-transparent shadow-none focus:border-input focus:bg-background"
			autofocus
		/>
		<Button type="submit" size="sm" disabled={!newName.trim()}>Add</Button>
	</form>
{/if}

{#if userData.activities.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Activity class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">No activities yet. Add one above.</p>
	</div>
{:else}
	<!-- Not logged today -->
	{#if due.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400"
			>
				<Activity class="size-3.5" />
				{isToday ? 'Today' : 'Not logged'} · {due.length}
			</h2>
			<ul
				class="divide-y divide-border rounded-lg border border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5"
			>
				{#each due as a (a.id)}
					<li animate:flip={{ duration: 350 }} class="flex items-center gap-3 p-3">
						{#if editing}
							{@render editRow(a)}
						{:else}
							{@const hex = paletteHex((a.color as PaletteToken | null) ?? null)}
							<span class="inline-flex size-7 items-center justify-center" aria-hidden="true">
								{#if hex}
									<span class="size-3 rounded-full" style={`background:${hex}`}></span>
								{:else}
									<span
										class="size-3 rounded-full border border-dashed border-muted-foreground/40"
									></span>
								{/if}
							</span>
							<button
								type="button"
								onclick={() => toggle(a)}
								class="min-w-0 flex-1 text-left font-medium"
								disabled={busy[a.id]}
							>
								{a.name}
							</button>
							<Button onclick={() => toggle(a)} size="sm" class="gap-1.5" disabled={busy[a.id]}>
								<Check class="size-3.5" />
								Did it
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Logged today -->
	{#if done.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			>
				<Check class="size-3.5" />
				{isToday ? 'Logged' : 'Logged on day'} · {done.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border">
				{#each done as a (a.id)}
					{@const burstHere = burst.has(a.id)}
					<li animate:flip={{ duration: 350 }} class="relative flex items-center gap-3 p-3">
						{#if editing}
							{@render editRow(a)}
						{:else}
							{@const hex = paletteHex((a.color as PaletteToken | null) ?? null)}
							<span class="inline-flex size-7 items-center justify-center" aria-hidden="true">
								{#if hex}
									<span class="size-3 rounded-full" style={`background:${hex}`}></span>
								{:else}
									<span
										class="size-3 rounded-full border border-dashed border-muted-foreground/40"
									></span>
								{/if}
							</span>
							<button
								type="button"
								onclick={() => toggle(a)}
								class="min-w-0 flex-1 text-left font-medium opacity-90"
								disabled={busy[a.id]}
							>
								{a.name}
							</button>
							<Button
								onclick={() => toggle(a)}
								size="sm"
								variant="outline"
								class="gap-1.5"
								disabled={busy[a.id]}
								title="Untick"
							>
								<Check class="size-3.5" />
								Done
							</Button>
						{/if}

						{#if burstHere}
							<span
								class="pointer-events-none absolute inset-0 grid place-items-center"
								out:fade={{ duration: 800 }}
							>
								<span
									class="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-lg"
									style="animation: activity-burst 800ms ease-out forwards;"
								>
									<Sparkles class="size-3" />
									Logged!
								</span>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#snippet editRow(a: ActivityRow)}
	<ColorTrigger
		value={(a.color as PaletteToken | null) ?? null}
		onchange={(c) => setColor(a, c)}
		label="Change activity color"
	/>
	<Input
		value={a.name}
		onblur={(e) => rename(a, (e.currentTarget as HTMLInputElement).value)}
		class="h-9 flex-1"
		aria-label="Activity name"
	/>
	<Button
		type="button"
		variant="ghost"
		size="icon-sm"
		class="text-destructive hover:bg-destructive/10 hover:text-destructive"
		aria-label="Delete activity"
		onclick={() => archive(a)}
	>
		<Trash2 class="size-4" />
	</Button>
{/snippet}

<style>
	@keyframes activity-burst {
		0% {
			transform: scale(0.6) translateY(0);
			opacity: 0;
		}
		25% {
			transform: scale(1.05) translateY(0);
			opacity: 1;
		}
		70% {
			transform: scale(1) translateY(-4px);
			opacity: 1;
		}
		100% {
			transform: scale(0.9) translateY(-12px);
			opacity: 0;
		}
	}
</style>
