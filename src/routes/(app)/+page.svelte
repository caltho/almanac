<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { formatMoney, currentYearMonth, monthRange } from '$lib/finance';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Check from '@lucide/svelte/icons/check';
	import Moon from '@lucide/svelte/icons/moon';
	import Repeat from '@lucide/svelte/icons/repeat';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { useUserData, type Habit } from '$lib/stores/userData.svelte';

	let { data } = $props();
	const userData = useUserData();

	const today = new Date().toISOString().slice(0, 10);
	const name = $derived(data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'you');

	type Cadence = 'daily' | 'weekdays' | 'weekly' | 'monthly';
	const CADENCE_LABELS: Record<Cadence, string> = {
		daily: 'Daily',
		weekdays: 'Weekdays',
		weekly: 'Weekly',
		monthly: 'Monthly'
	};

	// Slice the store down to dashboard-sized lists.
	const recentJournal = $derived(userData.journalEntries.slice(0, 3));
	const recentNotes = $derived(
		userData.quickNotes
			.filter((n) => !n.internalised)
			.slice()
			.sort((a, b) => b.created_at.localeCompare(a.created_at))
			.slice(0, 5)
	);
	const openTasks = $derived(
		userData.tasks
			.filter((t) => t.status === 'todo' || t.status === 'doing')
			.slice()
			.sort((a, b) => {
				if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
				if (a.due_date) return -1;
				if (b.due_date) return 1;
				return 0;
			})
			.slice(0, 5)
	);

	// Cadence-aware "is this habit due on the current view date?" — same
	// logic as the habits page so the dashboard mirror stays in sync.
	function isHabitDue(habit: Habit, dateIso: string): boolean {
		const cadence = (habit.cadence as Cadence) ?? 'daily';
		const checks = userData.habitChecks.filter((c) => c.habit_id === habit.id);
		const sel = new Date(dateIso + 'T00:00:00');
		if (cadence === 'daily') return !checks.some((c) => c.check_date === dateIso);
		if (cadence === 'weekdays') {
			const dow = sel.getDay();
			if (dow === 0 || dow === 6) return false;
			return !checks.some((c) => c.check_date === dateIso);
		}
		if (cadence === 'weekly') {
			const start = new Date(sel);
			const dow = start.getDay() === 0 ? 7 : start.getDay();
			start.setDate(start.getDate() - (dow - 1));
			const end = new Date(start);
			end.setDate(end.getDate() + 6);
			const startIso = start.toISOString().slice(0, 10);
			const endIso = end.toISOString().slice(0, 10);
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

	const sortedHabits = $derived(
		userData.habits.slice().sort((a, b) => a.name.localeCompare(b.name))
	);

	// --- Sleep chart ---------------------------------------------------------
	type SleepRange = '1w' | '1m' | '3m' | '1y';
	const RANGE_DAYS: Record<SleepRange, number> = { '1w': 7, '1m': 30, '3m': 90, '1y': 365 };
	const RANGE_LABELS: Record<SleepRange, string> = {
		'1w': '1W',
		'1m': '1M',
		'3m': '3M',
		'1y': '1Y'
	};
	let sleepRange = $state<SleepRange>('1m');
	const sleepDays = $derived(RANGE_DAYS[sleepRange]);

	type SleepPoint = {
		date: string;
		index: number;
		hours: number;
		quality: number | null;
		notes: string | null;
	};

	// Chronological windowed series — used for X-axis range labels and the
	// "X of N nights logged" stat. Logged points only feed the line.
	const sleepSeries = $derived.by(() => {
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		const out: { date: string; index: number }[] = [];
		for (let i = sleepDays - 1; i >= 0; i--) {
			const d = new Date(t);
			d.setDate(d.getDate() - i);
			out.push({ date: d.toISOString().slice(0, 10), index: sleepDays - 1 - i });
		}
		return out;
	});

	const sleepPoints = $derived.by(() => {
		const cutoff = sleepSeries[0]?.date ?? '';
		const positions = new Map(sleepSeries.map((s) => [s.date, s.index]));
		return userData.sleepLogs
			.filter(
				(s): s is typeof s & { hours_slept: number } =>
					typeof s.hours_slept === 'number' && s.log_date >= cutoff
			)
			.map((s) => ({
				date: s.log_date,
				index: positions.get(s.log_date) ?? 0,
				hours: s.hours_slept,
				quality: s.quality ?? null,
				notes: s.notes ?? null
			}))
			.sort((a, b) => a.index - b.index) satisfies SleepPoint[];
	});

	const sleepAvg = $derived.by(() => {
		if (sleepPoints.length === 0) return null;
		return sleepPoints.reduce((a, b) => a + b.hours, 0) / sleepPoints.length;
	});

	// Last-night and 3-day average pull from the full sleepLogs (not the
	// range-windowed series), since these stats should always reflect the
	// freshest data regardless of which range the user is viewing.
	const allLoggedDesc = $derived(
		userData.sleepLogs
			.filter(
				(s): s is typeof s & { hours_slept: number } => typeof s.hours_slept === 'number'
			)
			.slice()
			.sort((a, b) => b.log_date.localeCompare(a.log_date))
	);

	const lastNight = $derived(allLoggedDesc[0] ?? null);

	const sleep3DayAvg = $derived.by(() => {
		if (allLoggedDesc.length === 0) return null;
		const ref = new Date();
		ref.setHours(0, 0, 0, 0);
		const cutoff = new Date(ref);
		cutoff.setDate(ref.getDate() - 2);
		const cutoffIso = cutoff.toISOString().slice(0, 10);
		const recent = allLoggedDesc.filter((s) => s.log_date >= cutoffIso);
		const sample = recent.length > 0 ? recent : allLoggedDesc.slice(0, 3);
		return sample.reduce((a, b) => a + b.hours_slept, 0) / sample.length;
	});

	const sleepDelta = $derived(
		lastNight && sleepAvg !== null ? lastNight.hours_slept - sleepAvg : null
	);
	const sleepMin = $derived(
		sleepPoints.length === 0 ? null : Math.min(...sleepPoints.map((p) => p.hours))
	);
	const sleepMax = $derived(
		sleepPoints.length === 0 ? null : Math.max(...sleepPoints.map((p) => p.hours))
	);

	function sleepBandLabel(h: number): string {
		if (h >= 7 && h <= 9) return 'Good';
		if (h >= 6 && h < 7) return 'Poor';
		if (h > 9) return 'Long';
		return 'Awful';
	}
	function sleepBandColor(h: number): string {
		if (h >= 7) return '#10b981';
		if (h >= 6) return '#f59e0b';
		return '#ef4444';
	}

	const sleepYRange = $derived.by(() => {
		if (sleepPoints.length === 0) return { min: 4, max: 10 };
		const lo = Math.floor(Math.min(...sleepPoints.map((p) => p.hours)) - 0.5);
		const hi = Math.ceil(Math.max(...sleepPoints.map((p) => p.hours)) + 0.5);
		return { min: Math.min(lo, 5), max: Math.max(hi, 9) };
	});

	function xPct(i: number): number {
		return sleepDays === 1 ? 50 : (i / (sleepDays - 1)) * 100;
	}
	function yPct(h: number): number {
		const span = sleepYRange.max - sleepYRange.min;
		return ((sleepYRange.max - h) / span) * 100;
	}

	function fmtFull(date: string) {
		return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	// Hover/tap interaction: find the nearest logged point by X and pin the
	// crosshair + popover there. Powered by an invisible <rect> overlay so
	// the whole chart area is the hit zone, not just the dots.
	let chartEl = $state<HTMLDivElement>();
	let hoveredIndex = $state<number | null>(null);

	function pickNearest(clientX: number) {
		if (!chartEl || sleepPoints.length === 0) return;
		const rect = chartEl.getBoundingClientRect();
		const xRel = ((clientX - rect.left) / rect.width) * 100;
		let best = 0;
		let bestDist = Infinity;
		for (let i = 0; i < sleepPoints.length; i++) {
			const dx = Math.abs(xPct(sleepPoints[i].index) - xRel);
			if (dx < bestDist) {
				bestDist = dx;
				best = i;
			}
		}
		hoveredIndex = best;
	}

	function onPointerMove(e: PointerEvent) {
		pickNearest(e.clientX);
	}
	function onPointerLeave() {
		hoveredIndex = null;
	}

	const hovered = $derived(
		hoveredIndex !== null ? (sleepPoints[hoveredIndex] ?? null) : null
	);

	// --- This-month finance KPI ---------------------------------------------
	const finance = $derived.by(() => {
		const ym = currentYearMonth();
		const { start, end } = monthRange(ym);
		let income = 0;
		let spend = 0;
		for (const t of userData.recentTransactions) {
			if (t.posted_at < start || t.posted_at > end) continue;
			if (t.amount >= 0) income += t.amount;
			else spend += Math.abs(t.amount);
		}
		return { income, spend, net: income - spend, yearMonth: ym };
	});

	function fmtDue(d: string | null) {
		if (!d) return '';
		const date = new Date(d + 'T00:00:00');
		const now = new Date();
		now.setHours(0, 0, 0, 0);
		const diff = Math.round((date.getTime() - now.getTime()) / 86400000);
		if (diff === 0) return 'Today';
		if (diff === 1) return 'Tomorrow';
		if (diff === -1) return 'Yesterday';
		if (diff < 0) return `${-diff}d overdue`;
		if (diff < 7) return `in ${diff}d`;
		return date.toLocaleDateString();
	}

	function fmtDate(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
			weekday: 'short',
			day: 'numeric',
			month: 'short'
		});
	}

	async function toggleHabit(habit_id: string) {
		const wasTicked = userData.habitTickedOn(habit_id, today);
		userData.toggleHabitCheck(habit_id, today, !wasTicked);
		try {
			const res = await fetch('/tasks/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggle', habit_id, check_date: today, done: !wasTicked })
			});
			if (!res.ok) throw new Error();
		} catch {
			userData.toggleHabitCheck(habit_id, today, wasTicked);
		}
	}
</script>

<section class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">Hey {name}.</h1>
		<p class="text-sm text-muted-foreground">{fmtDate(today)}.</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<Repeat class="size-4" />
					<Card.Title class="text-base">Today's habits</Card.Title>
				</div>
				<Button href="/tasks/habits" variant="ghost" size="sm">All</Button>
			</Card.Header>
			<Card.Content>
				{#if sortedHabits.length === 0}
					<p class="text-sm text-muted-foreground">
						No habits yet. <a class="underline" href="/tasks/habits">Add one</a>.
					</p>
				{:else}
					<div class="grid gap-2 sm:grid-cols-2">
						{#each sortedHabits as h (h.id)}
							{@const ticked = !isHabitDue(h, today)}
							{@const cad = (h.cadence as Cadence) ?? 'daily'}
							<button
								type="button"
								onclick={() => toggleHabit(h.id)}
								class={`relative flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-all ${
									ticked
										? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm'
										: 'border-border bg-card hover:border-foreground/30'
								}`}
								aria-pressed={ticked}
							>
								<span class="flex w-full items-center gap-1.5 text-sm font-semibold">
									{#if ticked}
										<Check class="size-3.5 shrink-0" />
									{/if}
									<span class="truncate">{h.name}</span>
								</span>
								<span
									class={`text-[10px] tracking-wide uppercase ${
										ticked ? 'text-white/80' : 'text-muted-foreground'
									}`}
								>
									{ticked ? 'Done' : CADENCE_LABELS[cad]}
								</span>
							</button>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<CheckCircle2 class="size-4" />
					<Card.Title class="text-base">Up next</Card.Title>
				</div>
				<Button href="/tasks" variant="ghost" size="sm">All</Button>
			</Card.Header>
			<Card.Content>
				{#if openTasks.length === 0}
					<p class="text-sm text-muted-foreground">Nothing on the list. 🎉</p>
				{:else}
					<ul class="-my-1 divide-y divide-border">
						{#each openTasks as t (t.id)}
							<li class="flex items-center gap-2 py-2 text-sm">
								<a href={`/tasks/${t.id}`} class="min-w-0 flex-1 truncate hover:underline">
									{t.title}
								</a>
								{#if t.due_date}
									<Badge variant="secondary" class="shrink-0 text-[10px]">{fmtDue(t.due_date)}</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root class="md:col-span-2">
			<Card.Header class="space-y-3">
				<div class="flex items-start justify-between gap-2">
					<div class="flex items-center gap-2">
						<Moon class="size-4 text-muted-foreground" />
						<Card.Title class="text-base">Sleep</Card.Title>
					</div>
					<Button href="/sleep" variant="ghost" size="sm">Log</Button>
				</div>

				<div class="flex flex-wrap items-end gap-x-6 gap-y-2">
					<div class="space-y-0.5">
						<div class="text-[10px] tracking-widest text-muted-foreground uppercase">
							Last night
						</div>
						<div class="flex items-baseline gap-2">
							<span class="text-3xl font-semibold tracking-tight tabular-nums">
								{#if lastNight}{lastNight.hours_slept}{:else}—{/if}<span
									class="ml-0.5 text-base text-muted-foreground">h</span
								>
							</span>
							{#if sleepDelta !== null}
								{@const up = sleepDelta >= 0}
								<span
									class={`text-xs tabular-nums ${
										up ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
									}`}
								>
									{up ? '↑' : '↓'}{Math.abs(sleepDelta).toFixed(1)}h
									<span class="text-muted-foreground">vs {sleepRange.toUpperCase()} avg</span>
								</span>
							{/if}
						</div>
					</div>
					<div class="space-y-0.5">
						<div class="text-[10px] tracking-widest text-muted-foreground uppercase">
							3-day avg
						</div>
						<div class="text-xl font-medium tracking-tight tabular-nums">
							{#if sleep3DayAvg !== null}{sleep3DayAvg.toFixed(1)}<span
									class="ml-0.5 text-sm text-muted-foreground">h</span
								>{:else}—{/if}
						</div>
					</div>
				</div>

				<div role="tablist" aria-label="Sleep range" class="flex gap-1">
					{#each Object.keys(RANGE_DAYS) as SleepRange[] as r (r)}
						{@const active = r === sleepRange}
						<button
							type="button"
							role="tab"
							aria-selected={active}
							onclick={() => (sleepRange = r)}
							class={`rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors ${
								active
									? 'bg-foreground text-background'
									: 'bg-muted/40 text-muted-foreground hover:bg-muted'
							}`}
						>
							{RANGE_LABELS[r]}
						</button>
					{/each}
				</div>
			</Card.Header>

			<Card.Content>
				{#if sleepPoints.length === 0}
					<p class="text-sm text-muted-foreground">
						<a class="underline" href="/sleep">Log your first night</a> to start the chart.
					</p>
				{:else}
					<div class="space-y-2">
						<div
							bind:this={chartEl}
							class="relative h-[180px] w-full pr-8 sm:h-[220px]"
							onpointermove={onPointerMove}
							onpointerleave={onPointerLeave}
							role="application"
							aria-label="Sleep chart — hover to see per-night details"
						>
							<svg
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
								class="absolute inset-0 size-full overflow-visible"
								role="img"
								aria-label={`Sleep hours over the last ${sleepDays} nights`}
							>
								<defs>
									<linearGradient id="sleepFill" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0%" stop-color="currentColor" stop-opacity="0.18" />
										<stop offset="100%" stop-color="currentColor" stop-opacity="0" />
									</linearGradient>
								</defs>

								<!-- Faint horizontal grid at 6 / 7 / 9 -->
								{#each [6, 7, 9] as g (g)}
									{#if g >= sleepYRange.min && g <= sleepYRange.max}
										<line
											x1="0"
											x2="100"
											y1={yPct(g)}
											y2={yPct(g)}
											stroke="currentColor"
											stroke-opacity="0.08"
											stroke-width="0.4"
											vector-effect="non-scaling-stroke"
										/>
									{/if}
								{/each}

								<!-- Average reference line -->
								{#if sleepAvg !== null}
									<line
										x1="0"
										x2="100"
										y1={yPct(sleepAvg)}
										y2={yPct(sleepAvg)}
										stroke="currentColor"
										stroke-width="0.5"
										stroke-dasharray="2 2"
										class="text-muted-foreground"
										vector-effect="non-scaling-stroke"
									/>
								{/if}

								<!-- Filled area under the continuous line -->
								{#if sleepPoints.length >= 2}
									{@const xs = sleepPoints.map((p) => xPct(p.index))}
									{@const ys = sleepPoints.map((p) => yPct(p.hours))}
									<path
										d={`M ${xs[0]},100 L ${xs.map((x, j) => `${x},${ys[j]}`).join(' L ')} L ${xs[xs.length - 1]},100 Z`}
										fill="url(#sleepFill)"
										class="text-emerald-500"
									/>
								{/if}

								<!-- Single continuous polyline through every logged point — gaps
									in the calendar collapse here so the line stays unbroken. -->
								{#if sleepPoints.length >= 2}
									<polyline
										points={sleepPoints.map((p) => `${xPct(p.index)},${yPct(p.hours)}`).join(' ')}
										fill="none"
										stroke="currentColor"
										stroke-width="1.6"
										stroke-linecap="round"
										stroke-linejoin="round"
										class="text-emerald-600 dark:text-emerald-400"
										vector-effect="non-scaling-stroke"
									/>
								{/if}

								<!-- Subtle dot at every logged point. -->
								{#each sleepPoints as p (p.date)}
									<circle
										cx={xPct(p.index)}
										cy={yPct(p.hours)}
										r="1.4"
										fill="currentColor"
										class="text-emerald-600 dark:text-emerald-400"
										vector-effect="non-scaling-stroke"
									/>
								{/each}

								<!-- Hover crosshair + halo -->
								{#if hovered}
									<line
										x1={xPct(hovered.index)}
										x2={xPct(hovered.index)}
										y1="0"
										y2="100"
										stroke="currentColor"
										stroke-opacity="0.25"
										stroke-width="0.5"
										vector-effect="non-scaling-stroke"
									/>
									<circle
										cx={xPct(hovered.index)}
										cy={yPct(hovered.hours)}
										r="3.4"
										fill={sleepBandColor(hovered.hours)}
										fill-opacity="0.25"
									/>
									<circle
										cx={xPct(hovered.index)}
										cy={yPct(hovered.hours)}
										r="2"
										fill={sleepBandColor(hovered.hours)}
										stroke="white"
										stroke-width="0.8"
										vector-effect="non-scaling-stroke"
									/>
								{/if}
							</svg>

							<!-- Y-axis labels -->
							<div
								class="pointer-events-none absolute top-0 right-0 h-full w-7 text-[10px] tabular-nums text-muted-foreground"
							>
								{#each [9, 7, 6] as g (g)}
									{#if g >= sleepYRange.min && g <= sleepYRange.max}
										<span
											class="absolute right-0 -translate-y-1/2 pl-1"
											style={`top: ${yPct(g)}%`}>{g}h</span
										>
									{/if}
								{/each}
							</div>

							<!-- Hover popover -->
							{#if hovered}
								{@const left = xPct(hovered.index)}
								{@const flip = left > 60}
								<div
									class="pointer-events-none absolute z-10 w-[180px] rounded-lg border bg-popover p-2.5 text-xs text-popover-foreground shadow-md"
									style={`top: ${Math.min(yPct(hovered.hours), 75)}%; left: calc(${left}% + ${flip ? '-12px' : '12px'}); transform: translate(${flip ? '-100%' : '0'}, -50%);`}
									role="tooltip"
								>
									<div class="text-[10px] tracking-widest text-muted-foreground uppercase">
										{fmtFull(hovered.date)}
									</div>
									<div class="mt-0.5 flex items-baseline gap-1.5">
										<span class="text-lg font-semibold tabular-nums">{hovered.hours}h</span>
										<span
											class="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
											style={`background:${sleepBandColor(hovered.hours)}`}
										>
											{sleepBandLabel(hovered.hours)}
										</span>
									</div>
									{#if hovered.quality !== null}
										<div class="mt-1 text-muted-foreground">
											Quality <span class="text-foreground tabular-nums"
												>{hovered.quality}/10</span
											>
										</div>
									{/if}
									{#if hovered.notes}
										<div
											class="mt-1 line-clamp-3 border-t border-border/60 pt-1 text-muted-foreground"
										>
											{hovered.notes}
										</div>
									{/if}
								</div>
							{/if}
						</div>

						<!-- X-axis: range start → range end -->
						<div
							class="flex items-center justify-between pr-8 text-[10px] tabular-nums text-muted-foreground"
						>
							<span>{fmtFull(sleepSeries[0].date)}</span>
							{#if sleepAvg !== null}
								<span>avg {sleepAvg.toFixed(1)}h</span>
							{/if}
							<span>{fmtFull(sleepSeries[sleepSeries.length - 1].date)}</span>
						</div>

						<!-- Stats strip + legend -->
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px]">
							<span class="text-muted-foreground">
								<span class="font-medium text-foreground tabular-nums"
									>{sleepPoints.length}</span
								>
								/ {sleepDays} logged
							</span>
							{#if sleepMin !== null && sleepMax !== null}
								<span class="text-muted-foreground tabular-nums">
									low <span class="font-medium text-foreground">{sleepMin}h</span>
								</span>
								<span class="text-muted-foreground tabular-nums">
									high <span class="font-medium text-foreground">{sleepMax}h</span>
								</span>
							{/if}
							<span
								class="ml-auto inline-flex items-center gap-2 text-[10px] text-muted-foreground"
							>
								<span class="inline-flex items-center gap-1">
									<span class="size-1.5 rounded-full bg-emerald-500"></span>7-9
								</span>
								<span class="inline-flex items-center gap-1">
									<span class="size-1.5 rounded-full bg-amber-500"></span>6-7
								</span>
								<span class="inline-flex items-center gap-1">
									<span class="size-1.5 rounded-full bg-red-500"></span>&lt;6
								</span>
							</span>
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<Wallet class="size-4" />
					<Card.Title class="text-base">This month</Card.Title>
				</div>
				<Button href="/finance" variant="ghost" size="sm">View</Button>
			</Card.Header>
			<Card.Content class="space-y-1">
				<div class="flex items-baseline gap-3 text-sm">
					<span class="text-emerald-600">+{formatMoney(finance.income)}</span>
					<span class="text-destructive">−{formatMoney(finance.spend)}</span>
				</div>
				<div
					class={`text-2xl font-semibold ${finance.net < 0 ? 'text-destructive' : 'text-emerald-600'}`}
				>
					{formatMoney(finance.net, 'AUD', { showSign: true })}
				</div>
				<div class="text-xs text-muted-foreground">{finance.yearMonth} · net</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<StickyNote class="size-4" />
					<Card.Title class="text-base">Recent notes</Card.Title>
				</div>
				<Button href="/journal" variant="ghost" size="sm">All</Button>
			</Card.Header>
			<Card.Content>
				{#if recentNotes.length === 0}
					<p class="text-sm text-muted-foreground">
						No quick notes. <a class="underline" href="/journal">Pin one</a>.
					</p>
				{:else}
					<ul class="space-y-1 text-sm">
						{#each recentNotes as n (n.id)}
							<li class="flex items-start gap-2">
								<span
									class="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
									aria-hidden="true"
								></span>
								<a href="/journal" class="min-w-0 flex-1 truncate hover:underline">
									<span class="font-medium">{n.title}</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<Card.Root>
		<Card.Header class="flex-row items-center justify-between">
			<div class="flex items-center gap-2">
				<BookOpen class="size-4" />
				<Card.Title class="text-base">Recent journal</Card.Title>
			</div>
			<Button href="/journal" variant="ghost" size="sm">All</Button>
		</Card.Header>
		<Card.Content>
			{#if recentJournal.length === 0}
				<p class="text-sm text-muted-foreground">
					<a class="underline" href="/journal/new">Write the first entry</a>.
				</p>
			{:else}
				<ul class="-my-1 divide-y divide-border">
					{#each recentJournal as e (e.id)}
						<li class="py-2 text-sm">
							<a href={`/journal/${e.id}`} class="block hover:underline">
								<div class="flex items-center gap-2">
									<time class="text-xs tracking-wider text-muted-foreground uppercase"
										>{fmtDate(e.entry_date)}</time
									>
									{#if typeof e.mood === 'number'}
										<Badge variant="secondary" class="text-[10px]">Mood {e.mood}/10</Badge>
									{/if}
								</div>
								{#if e.title}<div class="font-medium">{e.title}</div>{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</section>
