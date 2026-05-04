<script lang="ts">
	import { enhance } from '$app/forms';
	import { flip } from 'svelte/animate';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import DateScroller from '$lib/components/DateScroller.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Flame from '@lucide/svelte/icons/flame';
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

	// --- date helpers ----------------------------------------------------
	import { localIso, localMidnight, dateFromIso, addDays } from '$lib/dates';

	const today = localMidnight();
	const todayIso = localIso(today);

	let selectedIso = $state(todayIso);
	const selectedDate = $derived(dateFromIso(selectedIso));
	const isToday = $derived(selectedIso === todayIso);
	const selectedLabel = $derived.by(() => {
		const dt = selectedDate;
		const weekday = dt.toLocaleDateString(undefined, { weekday: 'long' });
		const dd = String(dt.getDate()).padStart(2, '0');
		const mm = String(dt.getMonth() + 1).padStart(2, '0');
		return `${weekday} ${dd}/${mm}/${dt.getFullYear()}`;
	});

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
			const startIsoLocal = localIso(start);
			const endIsoLocal = localIso(end);
			return !checks.some(
				(c) => c.check_date >= startIsoLocal && c.check_date <= endIsoLocal
			);
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
			if (dates.has(localIso(d))) n++;
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
		try {
			const res = await fetch('/tasks/habits/api', {
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
			const res = await fetch('/tasks/habits/api', {
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
			const res = await fetch('/tasks/habits/api', {
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
			const res = await fetch('/tasks/habits/api', {
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
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
		{#each sortedHabits as h (h.id)}
			{@const cad = (h.cadence as Cadence) ?? 'daily'}
			{@const ticked = !isDue(h)}
			{@const st = streak(h)}
			<div class="habit-card-wrap" animate:flip={{ duration: 350 }}>
				{#if editing}
					<div class="flex items-center gap-2 rounded-xl border bg-card p-3">
						{@render editRow(h, cad)}
					</div>
				{:else}
					<button
						type="button"
						onclick={() => toggle(h)}
						class={`habit-card ${ticked ? 'is-flipped' : ''}`}
						aria-pressed={ticked}
						aria-label={ticked ? `Untick ${h.name}` : `Mark ${h.name} done`}
					>
						<!-- FRONT: not-done state -->
						<span class="habit-face habit-front">
							<span class="text-base font-semibold tracking-tight">{h.name}</span>
							<span class="text-xs text-muted-foreground">{CADENCE_LABELS[cad]}</span>
							{#if st >= 3}
								<span
									class="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
								>
									<Flame class="size-2.5" />{st}
								</span>
							{/if}
						</span>

						<!-- BACK: completed state -->
						<span class="habit-face habit-back">
							<Check class="size-6" />
							<span class="text-base font-semibold tracking-tight">Completed!</span>
							<span class="text-xs opacity-90">{h.name}</span>
						</span>
					</button>
				{/if}
			</div>
		{/each}
	</div>
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

	/* --- flip card -------------------------------------------------- */
	.habit-card-wrap {
		perspective: 900px;
	}
	.habit-card {
		position: relative;
		display: block;
		width: 100%;
		min-height: 110px;
		border-radius: 0.875rem;
		transform-style: preserve-3d;
		transition: transform 500ms cubic-bezier(0.4, 0.2, 0.2, 1);
		background: transparent;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
	.habit-card.is-flipped {
		transform: rotateY(180deg);
	}
	.habit-face {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		padding: 1rem;
		border-radius: 0.875rem;
		text-align: center;
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}
	.habit-front {
		background: hsl(var(--card, 0 0% 100%));
		color: hsl(var(--card-foreground, 0 0% 0%));
		border: 1px solid hsl(var(--border, 0 0% 90%));
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
	}
	.habit-card:hover .habit-front {
		border-color: hsl(var(--foreground, 0 0% 0%) / 0.25);
	}
	.habit-back {
		transform: rotateY(180deg);
		background: linear-gradient(135deg, #10b981, #059669);
		color: white;
		border: 2px solid #10b981;
		box-shadow:
			0 0 0 4px rgb(16 185 129 / 0.18),
			0 8px 24px -4px rgb(16 185 129 / 0.4);
	}
	@media (prefers-reduced-motion: reduce) {
		.habit-card {
			transition-duration: 1ms;
		}
	}
</style>
