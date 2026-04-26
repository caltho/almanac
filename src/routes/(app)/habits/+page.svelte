<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import Archive from '@lucide/svelte/icons/archive';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Plus from '@lucide/svelte/icons/plus';
	import Check from '@lucide/svelte/icons/check';
	import Flame from '@lucide/svelte/icons/flame';
	import LayoutList from '@lucide/svelte/icons/layout-list';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
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

	let view = $state<'list' | 'calendar'>('list');
	let showNew = $state(false);
	let adding = $state(false);

	// --- date helpers ----------------------------------------------------
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayIso = today.toISOString().slice(0, 10);

	function iso(d: Date): string {
		return d.toISOString().slice(0, 10);
	}
	function addDays(d: Date, n: number): Date {
		const out = new Date(d);
		out.setDate(out.getDate() + n);
		return out;
	}
	/** Monday of the week containing `d` (ISO week). */
	function weekStart(d: Date): Date {
		const out = new Date(d);
		out.setHours(0, 0, 0, 0);
		const dow = (out.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
		out.setDate(out.getDate() - dow);
		return out;
	}
	function monthStart(d: Date): Date {
		return new Date(d.getFullYear(), d.getMonth(), 1);
	}

	const last30Days = $derived.by(() => {
		const out: string[] = [];
		for (let i = 29; i >= 0; i--) out.push(iso(addDays(today, -i)));
		return out;
	});

	const last7Days = $derived.by(() => last30Days.slice(-7));

	const last4Weeks = $derived.by(() => {
		const out: { start: string; end: string; label: string }[] = [];
		const ws = weekStart(today);
		for (let i = 3; i >= 0; i--) {
			const start = addDays(ws, -7 * i);
			const end = addDays(start, 6);
			out.push({
				start: iso(start),
				end: iso(end),
				label: i === 0 ? 'This week' : `${i}w ago`
			});
		}
		return out;
	});

	const last6Months = $derived.by(() => {
		const out: { start: string; end: string; label: string }[] = [];
		const ms = monthStart(today);
		for (let i = 5; i >= 0; i--) {
			const start = new Date(ms.getFullYear(), ms.getMonth() - i, 1);
			const end = new Date(ms.getFullYear(), ms.getMonth() - i + 1, 0);
			out.push({
				start: iso(start),
				end: iso(end),
				label: i === 0 ? 'This month' : start.toLocaleDateString(undefined, { month: 'short' })
			});
		}
		return out;
	});

	// --- habit-status calculations --------------------------------------

	/** Is `habit` due (i.e. overdue / not yet ticked) for the current cadence window? */
	function isDue(habit: Habit): boolean {
		const cadence = (habit.cadence as Cadence) ?? 'daily';
		const checks = userData.habitChecks.filter((c) => c.habit_id === habit.id);

		if (cadence === 'daily') {
			return !checks.some((c) => c.check_date === todayIso);
		}
		if (cadence === 'weekdays') {
			const dow = today.getDay();
			if (dow === 0 || dow === 6) return false; // weekend, not due
			return !checks.some((c) => c.check_date === todayIso);
		}
		if (cadence === 'weekly') {
			const ws = iso(weekStart(today));
			const we = iso(addDays(weekStart(today), 6));
			return !checks.some((c) => c.check_date >= ws && c.check_date <= we);
		}
		if (cadence === 'monthly') {
			const ms = iso(monthStart(today));
			return !checks.some((c) => c.check_date >= ms && c.check_date <= todayIso);
		}
		return false;
	}

	/** Current streak (consecutive cadence-windows including today) — daily/weekdays only. */
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
		return userData.habitChecks.some(
			(c) => c.habit_id === habitId && c.check_date === date
		);
	}

	function tickedInRange(habitId: string, start: string, end: string): boolean {
		return userData.habitChecks.some(
			(c) => c.habit_id === habitId && c.check_date >= start && c.check_date <= end
		);
	}

	// --- mutations -------------------------------------------------------

	async function markDone(habit: Habit) {
		// "Done!" always ticks today. For weekly/monthly habits, today's tick
		// counts as that period's tick.
		const wasTicked = tickedOn(habit.id, todayIso);
		userData.toggleHabitCheck(habit.id, todayIso, !wasTicked);
		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					op: 'toggle',
					habit_id: habit.id,
					check_date: todayIso,
					done: !wasTicked
				})
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.toggleHabitCheck(habit.id, todayIso, wasTicked);
		}
	}

	async function archive(habit: Habit) {
		userData.removeHabit(habit.id);
		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', habit_id: habit.id })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.habits = [...userData.habits, habit];
		}
	}

	// --- groupings -------------------------------------------------------

	const overdue = $derived(userData.habits.filter(isDue));

	const byCadence = $derived.by(() => {
		const out: Record<Cadence, Habit[]> = {
			daily: [],
			weekdays: [],
			weekly: [],
			monthly: []
		};
		const sorted = userData.habits.slice().sort((a, b) => a.name.localeCompare(b.name));
		for (const h of sorted) {
			const c = (h.cadence as Cadence) ?? 'daily';
			if (c in out) out[c].push(h);
		}
		return out;
	});

	function shortDay(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
	}
	function dayNum(d: string) {
		return new Date(d + 'T00:00:00').getDate();
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h1 class="text-2xl font-semibold tracking-tight">Habits</h1>
		<p class="text-sm text-muted-foreground">
			What you're trying to do regularly. Tick when done.
		</p>
	</div>
	<div class="flex items-center gap-1">
		<div class="mr-2 flex gap-0.5 rounded-md border p-0.5">
			<button
				type="button"
				onclick={() => (view = 'list')}
				class={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
					view === 'list' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted'
				}`}
			>
				<LayoutList class="size-3.5" />
				List
			</button>
			<button
				type="button"
				onclick={() => (view = 'calendar')}
				class={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
					view === 'calendar'
						? 'bg-foreground text-background'
						: 'text-muted-foreground hover:bg-muted'
				}`}
			>
				<CalendarDays class="size-3.5" />
				Calendar
			</button>
		</div>
		<Button variant="outline" size="sm" href="/habits/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
		<Button size="sm" onclick={() => (showNew = !showNew)}>
			<Plus class="size-4" />
			<span>{showNew ? 'Close' : 'New'}</span>
		</Button>
	</div>
</header>

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
{:else if view === 'list'}
	<!-- Overdue first — big, eye-catching, one click to clear. -->
	{#if overdue.length > 0}
		<section class="space-y-2">
			<h2
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400"
			>
				<Flame class="size-3.5" />
				Due now · {overdue.length}
			</h2>
			<ul class="divide-y divide-border rounded-lg border border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5">
				{#each overdue as h (h.id)}
					{@const cad = (h.cadence as Cadence) ?? 'daily'}
					<li class="flex items-center gap-3 p-3">
						<a href={`/habits/${h.id}`} class="min-w-0 flex-1">
							<div class="font-medium">{h.name}</div>
							<div class="text-xs text-muted-foreground">
								{CADENCE_LABELS[cad]}{#if cad === 'weekly'} · this week
								{:else if cad === 'monthly'} · this month
								{:else} · today{/if}
							</div>
						</a>
						<Button onclick={() => markDone(h)} size="sm" class="gap-1.5">
							<Check class="size-3.5" />
							Done!
						</Button>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Cadence sections -->
	{#each CADENCES as cad (cad)}
		{@const list = byCadence[cad]}
		{#if list.length > 0}
			<section class="space-y-2">
				<h2 class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
					{CADENCE_LABELS[cad]} · {list.length}
				</h2>
				<ul class="divide-y divide-border rounded-lg border">
					{#each list as h (h.id)}
						{@const due = isDue(h)}
						{@const st = streak(h)}
						<li class="grid grid-cols-[1fr_auto] items-center gap-3 p-3">
							<a href={`/habits/${h.id}`} class="min-w-0 space-y-1.5">
								<div class="flex flex-wrap items-center gap-2">
									<span class={`font-medium ${due ? '' : 'opacity-90'}`}>{h.name}</span>
									{#if !due}
										<Badge variant="secondary" class="gap-1 text-[10px]">
											<Check class="size-2.5" />
											Done
										</Badge>
									{/if}
									{#if st >= 3}
										<Badge variant="outline" class="gap-1 text-[10px] text-amber-600 dark:text-amber-400">
											<Flame class="size-2.5" />
											{st}
										</Badge>
									{/if}
								</div>

								<!-- Cadence-specific visual history -->
								{#if cad === 'daily' || cad === 'weekdays'}
									<div class="flex items-center gap-1">
										{#each last7Days as d (d)}
											{@const t = tickedOn(h.id, d)}
											{@const dow = new Date(d + 'T00:00:00').getDay()}
											{@const skip = cad === 'weekdays' && (dow === 0 || dow === 6)}
											<div
												class="flex flex-col items-center gap-0.5"
												title={`${shortDay(d)} ${dayNum(d)} — ${t ? 'done' : skip ? 'rest' : 'no'}`}
											>
												<span class={`size-5 rounded ${
													t
														? 'bg-foreground'
														: skip
															? 'bg-muted/40'
															: 'border border-dashed border-muted-foreground/40'
												}`}></span>
												<span class="text-[9px] text-muted-foreground">{shortDay(d)}</span>
											</div>
										{/each}
									</div>
								{:else if cad === 'weekly'}
									<div class="flex items-center gap-1">
										{#each last4Weeks as w (w.start)}
											{@const t = tickedInRange(h.id, w.start, w.end)}
											<div
												class="flex flex-col items-center gap-0.5"
												title={`${w.label} — ${t ? 'done' : 'no'}`}
											>
												<span class={`h-2 w-14 rounded-full ${
													t ? 'bg-foreground' : 'bg-muted'
												}`}></span>
												<span class="text-[9px] text-muted-foreground">{w.label}</span>
											</div>
										{/each}
									</div>
								{:else if cad === 'monthly'}
									<div class="flex items-center gap-1">
										{#each last6Months as m (m.start)}
											{@const t = tickedInRange(h.id, m.start, m.end)}
											<div
												class="flex flex-col items-center gap-0.5"
												title={`${m.label} — ${t ? 'done' : 'no'}`}
											>
												<span class={`h-2 w-10 rounded-full ${
													t ? 'bg-foreground' : 'bg-muted'
												}`}></span>
												<span class="text-[9px] text-muted-foreground">{m.label}</span>
											</div>
										{/each}
									</div>
								{/if}
							</a>
							<div class="flex items-center gap-1">
								{#if due}
									<Button onclick={() => markDone(h)} size="sm" class="gap-1.5">
										<Check class="size-3.5" />
										Done!
									</Button>
								{:else}
									<Button
										onclick={() => markDone(h)}
										size="sm"
										variant="outline"
										class="gap-1.5"
										title="Untick today"
									>
										<Check class="size-3.5" />
									</Button>
								{/if}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Archive"
									onclick={() => archive(h)}
								>
									<Archive class="size-4" />
								</Button>
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
{:else}
	<!-- Calendar view: rows = habits, cols = last 30 days. Heatmap-style. -->
	<section class="space-y-2 overflow-x-auto">
		<div
			class="grid items-center gap-x-1 gap-y-2 text-[10px]"
			style={`grid-template-columns: minmax(8rem, 12rem) repeat(${last30Days.length}, 1.1rem);`}
		>
			<span></span>
			{#each last30Days as d, i (d)}
				{@const showLabel = i === 0 || dayNum(d) === 1 || i === last30Days.length - 1}
				<span class="text-center text-muted-foreground">
					{showLabel ? dayNum(d) : ''}
				</span>
			{/each}

			{#each userData.habits as h (h.id)}
				{@const cad = (h.cadence as Cadence) ?? 'daily'}
				<a
					href={`/habits/${h.id}`}
					class="flex items-center gap-2 truncate text-sm hover:text-foreground"
					title={CADENCE_LABELS[cad]}
				>
					<span class="truncate">{h.name}</span>
				</a>
				{#each last30Days as d (d)}
					{@const t = tickedOn(h.id, d)}
					{@const dow = new Date(d + 'T00:00:00').getDay()}
					{@const skip = cad === 'weekdays' && (dow === 0 || dow === 6)}
					<button
						type="button"
						title={`${d} — ${t ? 'done' : 'no'}`}
						onclick={() => {
							const wasTicked = t;
							userData.toggleHabitCheck(h.id, d, !wasTicked);
							fetch('/habits/api', {
								method: 'POST',
								headers: { 'content-type': 'application/json' },
								body: JSON.stringify({
									op: 'toggle',
									habit_id: h.id,
									check_date: d,
									done: !wasTicked
								})
							}).catch(() => userData.toggleHabitCheck(h.id, d, wasTicked));
						}}
						class={`size-4 rounded transition-colors ${
							t
								? 'bg-foreground hover:opacity-80'
								: skip
									? 'bg-muted/40 hover:bg-muted'
									: 'bg-muted hover:bg-muted-foreground/30'
						}`}
						aria-label={`${h.name} on ${d}`}
					></button>
				{/each}
			{/each}
		</div>
		<div class="flex items-center gap-3 text-[10px] text-muted-foreground">
			<span class="flex items-center gap-1">
				<span class="size-3 rounded bg-muted"></span>
				not done
			</span>
			<span class="flex items-center gap-1">
				<span class="size-3 rounded bg-foreground"></span>
				done
			</span>
			<span class="flex items-center gap-1">
				<span class="size-3 rounded bg-muted/40"></span>
				rest day
			</span>
			<span class="ml-auto">Click any cell to toggle.</span>
		</div>
	</section>
{/if}
