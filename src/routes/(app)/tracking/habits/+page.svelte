<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import { fade } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import DateScroller from '$lib/components/DateScroller.svelte';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Flame from '@lucide/svelte/icons/flame';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { useUserData, type Habit } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();

	type Cadence = 'daily' | 'weekdays' | 'weekly' | 'monthly';
	const CADENCES: Cadence[] = ['daily', 'weekdays', 'weekly', 'monthly'];
	const CADENCE_LABELS: Record<Cadence, string> = {
		daily: 'Daily',
		weekdays: 'Weekdays',
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	let showNew = $state(false);
	let adding = $state(false);
	let editing = $state(false);

	// Track which habit just got ticked so we can sparkle for ~700ms.
	let burst = $state<Set<string>>(new Set());

	// --- date helpers ----------------------------------------------------
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIso = today.toISOString().slice(0, 10);

	let selectedIso = $state(todayIso);
	const selectedDate = $derived.by(() => {
		const [y, m, d] = selectedIso.split('-').map(Number);
		return new Date(y, m - 1, d);
	});
	const isToday = $derived(selectedIso === todayIso);
	const selectedLabel = $derived(
		selectedDate.toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		})
	);

	function iso(d: Date): string {
		return d.toISOString().slice(0, 10);
	}
	function addDays(d: Date, n: number): Date {
		const out = new Date(d);
		out.setDate(out.getDate() + n);
		return out;
	}

	// --- habit-status calculations --------------------------------------

	/**
	 * Cadence-aware "due" check. Daily/weekdays look at the exact selected
	 * date; weekly looks at the ISO week containing the selected date;
	 * monthly looks at the calendar month. So a weekly habit ticked on
	 * Monday stays Done all week and only flips back to Due the next week.
	 */
	function isDue(habit: Habit): boolean {
		const cadence = (habit.cadence as Cadence) ?? 'daily';
		const checks = userData.habitChecks.filter((c) => c.habit_id === habit.id);
		const sel = selectedDate;

		if (cadence === 'daily') {
			return !checks.some((c) => c.check_date === selectedIso);
		}
		if (cadence === 'weekdays') {
			const dow = sel.getDay();
			if (dow === 0 || dow === 6) return false; // weekends are rest days
			return !checks.some((c) => c.check_date === selectedIso);
		}
		if (cadence === 'weekly') {
			// Week starts Monday. Find Mon..Sun ISO range containing the selected day.
			const start = new Date(sel);
			const dow = start.getDay() === 0 ? 7 : start.getDay();
			start.setDate(start.getDate() - (dow - 1));
			const end = new Date(start);
			end.setDate(end.getDate() + 6);
			const startIso = iso(start);
			const endIso = iso(end);
			return !checks.some((c) => c.check_date >= startIso && c.check_date <= endIso);
		}
		if (cadence === 'monthly') {
			const y = sel.getFullYear();
			const m = sel.getMonth();
			return !checks.some((c) => {
				const [cy, cm] = c.check_date.split('-').map(Number);
				return cy === y && cm - 1 === m;
			});
		}
		return true;
	}

	function streak(habit: Habit): number {
		const cadence = (habit.cadence as Cadence) ?? 'daily';
		if (cadence === 'weekly' || cadence === 'monthly') return 0;
		const dates = new Set(
			userData.habitChecks.filter((c) => c.habit_id === habit.id).map((c) => c.check_date)
		);
		let n = 0;
		for (let i = 0; ; i++) {
			const d = addDays(today, -i);
			if (cadence === 'weekdays') {
				const dow = d.getDay();
				if (dow === 0 || dow === 6) continue;
			}
			if (dates.has(iso(d))) n++;
			else break;
			if (n > 365) break;
		}
		return n;
	}

	function tickedOn(habitId: string, date: string): boolean {
		return userData.habitChecks.some((c) => c.habit_id === habitId && c.check_date === date);
	}

	const habitCheckDates = $derived(new Set(userData.habitChecks.map((c) => c.check_date)));

	// --- mutations -------------------------------------------------------

	async function toggle(habit: Habit) {
		const wasTicked = tickedOn(habit.id, selectedIso);
		userData.toggleHabitCheck(habit.id, selectedIso, !wasTicked);

		if (!wasTicked) {
			burst = new Set([...burst, habit.id]);
			setTimeout(() => {
				burst.delete(habit.id);
				burst = new Set(burst);
			}, 800);
		}

		try {
			const res = await fetch('/tracking/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'toggle',
					habit_id: habit.id,
					check_date: selectedIso,
					done: !wasTicked
				})
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.toggleHabitCheck(habit.id, selectedIso, wasTicked);
		}
	}

	async function archive(habit: Habit) {
		userData.removeHabit(habit.id);
		try {
			const res = await fetch('/tracking/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', habit_id: habit.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.habits = [...userData.habits, habit];
		}
	}

	async function rename(habit: Habit, name: string) {
		const trimmed = name.trim();
		if (!trimmed || trimmed === habit.name) return;
		const prev = habit.name;
		userData.updateHabit(habit.id, { name: trimmed });
		try {
			const res = await fetch('/tracking/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'rename', habit_id: habit.id, name: trimmed })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateHabit(habit.id, { name: prev });
		}
	}

	async function setCadence(habit: Habit, cadence: Cadence) {
		if (cadence === habit.cadence) return;
		const prev = habit.cadence;
		userData.updateHabit(habit.id, { cadence });
		try {
			const res = await fetch('/tracking/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setCadence', habit_id: habit.id, cadence })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.updateHabit(habit.id, { cadence: prev });
		}
	}

	// --- groupings -------------------------------------------------------

	const sortedHabits = $derived(
		userData.habits.slice().sort((a, b) => a.name.localeCompare(b.name))
	);

	const due = $derived(sortedHabits.filter(isDue));
	const done = $derived(sortedHabits.filter((h) => !isDue(h)));
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Habits</h1>
		<p class="text-sm text-muted-foreground">
			{#if isToday}
				Click when done — they slip into the "Done" zone below.
			{:else}
				Viewing {selectedLabel}. Tick to backfill that day.
			{/if}
		</p>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" href="/tracking/habits/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
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
	activeDates={habitCheckDates}
/>

{#if showNew}
	<form
		method="POST"
		action="?/create"
		use:enhance={() => {
			adding = true;
			return async ({ update, result }) => {
				await update({ reset: true });
				adding = false;
				if (result.type === 'success') showNew = false;
			};
		}}
		class="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
	>
		<Input name="name" placeholder="What's the habit?" required autofocus />
		<select
			name="cadence"
			class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs sm:w-36"
		>
			{#each CADENCES as c (c)}
				<option value={c}>{CADENCE_LABELS[c]}</option>
			{/each}
		</select>
		<Button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add habit'}</Button>
		{#if form?.error}
			<p class="col-span-full text-sm text-destructive">{form.error}</p>
		{/if}
	</form>
{/if}

{#if userData.habits.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<Flame class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			No habits yet. <button class="underline" onclick={() => (showNew = true)}>Add one</button>.
		</p>
	</div>
{:else}
	<!-- Due now -->
	{#if due.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400"
			>
				<Flame class="size-3.5" />
				{isToday ? 'Due now' : 'Not ticked'} · {due.length}
			</h2>
			<ul
				class="divide-y divide-border rounded-lg border border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5"
			>
				{#each due as h (h.id)}
					{@const cad = (h.cadence as Cadence) ?? 'daily'}
					<li animate:flip={{ duration: 350 }} class="flex items-center gap-3 p-3">
						{#if editing}
							{@render editRow(h, cad)}
						{:else}
							<a href={`/tracking/habits/${h.id}`} class="min-w-0 flex-1">
								<div class="font-medium">{h.name}</div>
								<div class="text-xs text-muted-foreground">
									{CADENCE_LABELS[cad]}
								</div>
							</a>
							<Button onclick={() => toggle(h)} size="sm" class="gap-1.5">
								<Check class="size-3.5" />
								{isToday ? 'Done!' : 'Mark done'}
							</Button>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Done today -->
	{#if done.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			>
				<Check class="size-3.5" />
				{isToday ? 'Done' : 'Ticked'} · {done.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border">
				{#each done as h (h.id)}
					{@const cad = (h.cadence as Cadence) ?? 'daily'}
					{@const st = streak(h)}
					{@const burstHere = burst.has(h.id)}
					<li animate:flip={{ duration: 350 }} class="relative flex items-center gap-3 p-3">
						{#if editing}
							{@render editRow(h, cad)}
						{:else}
							<a href={`/tracking/habits/${h.id}`} class="min-w-0 flex-1 space-y-0.5">
								<div class="flex items-center gap-2">
									<span class="font-medium opacity-90">{h.name}</span>
									{#if st >= 3}
										<Badge
											variant="outline"
											class="gap-1 text-[10px] text-amber-600 dark:text-amber-400"
										>
											<Flame class="size-2.5" />
											{st}
										</Badge>
									{/if}
								</div>
								<div class="text-xs text-muted-foreground">
									{CADENCE_LABELS[cad]} · ticked
								</div>
							</a>
							<Button
								onclick={() => toggle(h)}
								size="sm"
								variant="outline"
								class="gap-1.5"
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
									style="animation: habit-burst 800ms ease-out forwards;"
								>
									<Sparkles class="size-3" />
									Nice!
								</span>
							</span>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#snippet editRow(h: Habit, cad: Cadence)}
	<Input
		value={h.name}
		onblur={(e) => rename(h, (e.currentTarget as HTMLInputElement).value)}
		class="h-9 flex-1"
		aria-label="Habit name"
	/>
	<select
		value={cad}
		onchange={(e) => setCadence(h, (e.currentTarget as HTMLSelectElement).value as Cadence)}
		class="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
		aria-label="Cadence"
	>
		{#each CADENCES as c (c)}
			<option value={c}>{CADENCE_LABELS[c]}</option>
		{/each}
	</select>
	<Button
		type="button"
		variant="ghost"
		size="icon-sm"
		class="text-destructive hover:bg-destructive/10 hover:text-destructive"
		aria-label="Delete habit"
		onclick={() => archive(h)}
	>
		<Trash2 class="size-4" />
	</Button>
{/snippet}

<style>
	@keyframes habit-burst {
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
