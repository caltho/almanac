<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { formatMoney, currentYearMonth, monthRange } from '$lib/finance';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Moon from '@lucide/svelte/icons/moon';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Wallet from '@lucide/svelte/icons/wallet';
	import { useUserData } from '$lib/stores/userData.svelte';

	let { data } = $props();
	const userData = useUserData();

	const today = new Date().toISOString().slice(0, 10);
	const name = $derived(data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'you');

	// Slice the store down to dashboard-sized lists.
	const recentJournal = $derived(userData.journalEntries.slice(0, 3));
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
	// Stock-ticker-style sleep chart: line over a selectable date range,
	// with band shading for Good/Poor/Awful sleep zones. Mobile-first —
	// generous touch targets on the range pills and a SVG that scales to
	// the card's width.
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

	type SleepPoint = { date: string; index: number; hours: number };

	const sleepSeries = $derived.by(() => {
		const byDate = new Map<string, number>();
		for (const s of userData.sleepLogs) {
			if (typeof s.hours_slept === 'number') byDate.set(s.log_date, s.hours_slept);
		}
		const out: { date: string; index: number; hours: number | null }[] = [];
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		for (let i = sleepDays - 1; i >= 0; i--) {
			const d = new Date(t);
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().slice(0, 10);
			out.push({ date: iso, index: sleepDays - 1 - i, hours: byDate.get(iso) ?? null });
		}
		return out;
	});

	const sleepPoints = $derived(
		sleepSeries.filter((d): d is SleepPoint => d.hours !== null)
	);

	// Drop one segment per run of consecutive logged days so missing days
	// leave a visible gap in the line — same pattern stock charts use for
	// trading-day-only data.
	const sleepSegments = $derived.by(() => {
		const segs: SleepPoint[][] = [];
		let cur: SleepPoint[] = [];
		for (const p of sleepPoints) {
			if (cur.length === 0 || p.index === cur[cur.length - 1].index + 1) {
				cur.push(p);
			} else {
				segs.push(cur);
				cur = [p];
			}
		}
		if (cur.length) segs.push(cur);
		return segs;
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

	// 3-day average rule: prefer the last 3 calendar days (today, yesterday,
	// day-before), averaging only the days that were actually logged. If none
	// of those 3 days were logged, fall back to the most recent 3 logged days.
	const sleep3DayAvg = $derived.by(() => {
		if (allLoggedDesc.length === 0) return null;
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const cutoff = new Date(today);
		cutoff.setDate(today.getDate() - 2);
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

	// SVG viewBox is 100 wide × 100 tall. The chart maps hours into a
	// dynamic Y range so short windows with similar values still spread
	// out vertically — tighter than the old fixed 0-12h scale.
	const sleepYRange = $derived.by(() => {
		if (sleepPoints.length === 0) return { min: 4, max: 10 };
		const lo = Math.floor(Math.min(...sleepPoints.map((p) => p.hours)) - 0.5);
		const hi = Math.ceil(Math.max(...sleepPoints.map((p) => p.hours)) + 0.5);
		// Always keep the Good band (7-9h) at least partially visible.
		return { min: Math.min(lo, 5), max: Math.max(hi, 9) };
	});

	function xPct(i: number, days: number): number {
		return days === 1 ? 50 : (i / (days - 1)) * 100;
	}
	function yPct(h: number, range: { min: number; max: number }): number {
		const span = range.max - range.min;
		return ((range.max - h) / span) * 100;
	}

	function fmtRangeStart(): string {
		return new Date(sleepSeries[0].date + 'T00:00:00').toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short'
		});
	}
	function fmtRangeEnd(): string {
		return new Date(
			sleepSeries[sleepSeries.length - 1].date + 'T00:00:00'
		).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	}

	// This-month finance KPIs computed from the recent-transactions window the
	// store already loaded (90d covers the current month for any day-of-month).
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
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diff = Math.round((date.getTime() - today.getTime()) / 86400000);
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
			// Roll back: flip the state back to its pre-click value.
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
				{#if userData.habits.length === 0}
					<p class="text-sm text-muted-foreground">
						No habits yet. <a class="underline" href="/tasks/habits">Add one</a>.
					</p>
				{:else}
					<ul class="space-y-1">
						{#each userData.habits as h (h.id)}
							{@const ticked = userData.habitTickedOn(h.id, today)}
							<li class="flex items-center gap-3 text-sm">
								<button
									type="button"
									onclick={() => toggleHabit(h.id)}
									class={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${
										ticked
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-border hover:border-foreground'
									}`}
									aria-label={`Tick ${h.name}`}
								>
									{#if ticked}✓{/if}
								</button>
								<span class={ticked ? 'line-through opacity-60' : ''}>{h.name}</span>
							</li>
						{/each}
					</ul>
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
									<Badge variant="secondary" class="shrink-0 text-[10px]"
										>{fmtDue(t.due_date)}</Badge
									>
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

				<!-- Headline: last night, 3-day rolling avg, delta vs range avg -->
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

				<!-- Range pills -->
				<div role="tablist" aria-label="Sleep range" class="flex gap-1">
					{#each (Object.keys(RANGE_DAYS) as SleepRange[]) as r (r)}
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
						<div class="relative h-[180px] w-full pr-8 sm:h-[220px]">
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
											y1={yPct(g, sleepYRange)}
											y2={yPct(g, sleepYRange)}
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
										y1={yPct(sleepAvg, sleepYRange)}
										y2={yPct(sleepAvg, sleepYRange)}
										stroke="currentColor"
										stroke-width="0.5"
										stroke-dasharray="2 2"
										class="text-muted-foreground"
										vector-effect="non-scaling-stroke"
									/>
								{/if}

								<!-- Filled area under the line, per consecutive segment -->
								{#each sleepSegments as seg, i (`fill-${i}`)}
									{#if seg.length >= 2}
										{@const xs = seg.map((p) => xPct(p.index, sleepDays))}
										{@const ys = seg.map((p) => yPct(p.hours, sleepYRange))}
										{@const path = `M ${xs[0]},100 L ${xs
											.map((x, j) => `${x},${ys[j]}`)
											.join(' L ')} L ${xs[xs.length - 1]},100 Z`}
										<path
											d={path}
											fill="url(#sleepFill)"
											class="text-emerald-500"
										/>
									{/if}
								{/each}

								<!-- Line per consecutive segment -->
								{#each sleepSegments as seg, i (`line-${i}`)}
									{#if seg.length >= 2}
										<polyline
											points={seg
												.map((p) => `${xPct(p.index, sleepDays)},${yPct(p.hours, sleepYRange)}`)
												.join(' ')}
											fill="none"
											stroke="currentColor"
											stroke-width="1.6"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="text-emerald-600 dark:text-emerald-400"
											vector-effect="non-scaling-stroke"
										/>
									{/if}
								{/each}

								<!-- Single soft halo + dot at the most recent point — Google
									Finance-style "current value" marker, instead of dotting
									every day. -->
								{#if sleepPoints.length > 0}
									{@const last = sleepPoints[sleepPoints.length - 1]}
									<circle
										cx={xPct(last.index, sleepDays)}
										cy={yPct(last.hours, sleepYRange)}
										r="3.6"
										class="text-emerald-500"
										fill="currentColor"
										fill-opacity="0.18"
									/>
									<circle
										cx={xPct(last.index, sleepDays)}
										cy={yPct(last.hours, sleepYRange)}
										r="1.6"
										class="text-emerald-600 dark:text-emerald-400"
										fill="currentColor"
										stroke="white"
										stroke-width="0.6"
										vector-effect="non-scaling-stroke"
									>
										<title
											>{last.date}: {last.hours}h ({sleepBandLabel(last.hours)})</title
										>
									</circle>
								{/if}
							</svg>

							<!-- Y-axis labels (right edge, outside the plot) -->
							<div
								class="pointer-events-none absolute top-0 right-0 h-full w-7 text-[10px] tabular-nums text-muted-foreground"
							>
								{#each [9, 7, 6] as g (g)}
									{#if g >= sleepYRange.min && g <= sleepYRange.max}
										<span
											class="absolute right-0 -translate-y-1/2 pl-1"
											style={`top: ${yPct(g, sleepYRange)}%`}>{g}h</span
										>
									{/if}
								{/each}
							</div>
						</div>

						<!-- X-axis: range start → range end -->
						<div
							class="flex items-center justify-between pr-8 text-[10px] tabular-nums text-muted-foreground"
						>
							<span>{fmtRangeStart()}</span>
							{#if sleepAvg !== null}
								<span>avg {sleepAvg.toFixed(1)}h</span>
							{/if}
							<span>{fmtRangeEnd()}</span>
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
