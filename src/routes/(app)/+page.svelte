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
	const lastSleep = $derived(userData.sleepLogs[0] ?? null);

	// Last 30 nights of sleep, oldest → newest. Only logged days get a point;
	// the line breaks across gaps so missing days don't pretend to be data.
	const sleepDays: number = 30;
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

	// Logged points only, with their position along the X axis (0 → sleepDays-1).
	const sleepPoints = $derived(
		sleepSeries.filter((d): d is { date: string; index: number; hours: number } => d.hours !== null)
	);

	// Group into runs of consecutive logged days so we can draw a separate line
	// per run and leave gaps where days are missing.
	const sleepSegments = $derived.by(() => {
		const segs: { date: string; index: number; hours: number }[][] = [];
		let cur: { date: string; index: number; hours: number }[] = [];
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

	function sleepBandColor(h: number): string {
		if (h >= 7) return '#10b981'; // green-500
		if (h >= 6) return '#f59e0b'; // amber-500
		return '#ef4444'; // red-500
	}
	function sleepBandLabel(h: number): string {
		if (h >= 7 && h <= 9) return 'Good';
		if (h >= 6 && h < 7) return 'Poor';
		if (h > 9) return 'Long';
		return 'Awful';
	}

	// SVG viewBox math: x ∈ [0, 100], y ∈ [0, 100]. yMax hours mapped to y=0
	// (top of chart) and 0 hours mapped to y=100 (bottom).
	const Y_MAX = 12;
	function xPct(i: number): number {
		return sleepDays === 1 ? 50 : (i / (sleepDays - 1)) * 100;
	}
	function yPct(h: number): number {
		return ((Y_MAX - h) / Y_MAX) * 100;
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
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<Moon class="size-4" />
					<Card.Title class="text-base">Sleep · last {sleepDays} nights</Card.Title>
				</div>
				<div class="flex items-center gap-2">
					{#if lastSleep}
						<span class="text-xs text-muted-foreground">
							Last: <span class="font-medium text-foreground"
								>{lastSleep.hours_slept ?? '—'}h</span
							>
							{#if typeof lastSleep.quality === 'number'}· Q{lastSleep.quality}/10{/if}
						</span>
					{/if}
					<Button href="/sleep" variant="ghost" size="sm">Log</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if sleepPoints.length === 0}
					<p class="text-sm text-muted-foreground">
						<a class="underline" href="/sleep">Log your first night</a> to start the chart.
					</p>
				{:else}
					<div class="space-y-2">
						<div class="relative h-[160px] w-full">
							<svg
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
								class="absolute inset-0 size-full overflow-visible"
								role="img"
								aria-label="Sleep hours over the last {sleepDays} nights"
							>
								<!-- Band shading: green 7-9, amber 6-7, red <6 -->
								<rect
									x="0"
									y={yPct(9)}
									width="100"
									height={yPct(7) - yPct(9)}
									fill="rgb(16 185 129 / 0.1)"
								/>
								<rect
									x="0"
									y={yPct(7)}
									width="100"
									height={yPct(6) - yPct(7)}
									fill="rgb(245 158 11 / 0.1)"
								/>
								<rect
									x="0"
									y={yPct(6)}
									width="100"
									height={yPct(0) - yPct(6)}
									fill="rgb(239 68 68 / 0.1)"
								/>

								<!-- Average reference line -->
								{#if sleepAvg !== null}
									<line
										x1="0"
										x2="100"
										y1={yPct(sleepAvg)}
										y2={yPct(sleepAvg)}
										stroke="currentColor"
										stroke-width="0.4"
										stroke-dasharray="1.5 1.5"
										class="text-foreground/40"
										vector-effect="non-scaling-stroke"
									/>
								{/if}

								<!-- Line segments through consecutive logged days -->
								{#each sleepSegments as seg, i (i)}
									{#if seg.length >= 2}
										<polyline
											points={seg.map((p) => `${xPct(p.index)},${yPct(p.hours)}`).join(' ')}
											fill="none"
											stroke="currentColor"
											stroke-width="1.4"
											stroke-linecap="round"
											stroke-linejoin="round"
											class="text-foreground"
											vector-effect="non-scaling-stroke"
										/>
									{/if}
								{/each}

								<!-- Points -->
								{#each sleepPoints as p (p.date)}
									<circle
										cx={xPct(p.index)}
										cy={yPct(p.hours)}
										r="2.2"
										fill={sleepBandColor(p.hours)}
										stroke="white"
										stroke-width="0.6"
										vector-effect="non-scaling-stroke"
									>
										<title>{p.date}: {p.hours}h ({sleepBandLabel(p.hours)})</title>
									</circle>
								{/each}
							</svg>

							<!-- Y-axis labels overlay (12, 9, 7, 6, 0) -->
							<div class="pointer-events-none absolute inset-0 text-[10px] text-muted-foreground">
								<span class="absolute right-0" style={`top: ${yPct(9)}%`}>9h</span>
								<span class="absolute right-0" style={`top: ${yPct(7)}%`}>7h</span>
								<span class="absolute right-0" style={`top: ${yPct(6)}%`}>6h</span>
								{#if sleepAvg !== null}
									<span class="absolute left-0" style={`top: ${yPct(sleepAvg)}%`}>
										avg {sleepAvg.toFixed(1)}h
									</span>
								{/if}
							</div>
						</div>

						<!-- X-axis: show first/last date labels -->
						<div class="flex justify-between text-[10px] text-muted-foreground">
							<span>{fmtDate(sleepSeries[0].date)}</span>
							<span>{fmtDate(sleepSeries[sleepSeries.length - 1].date)}</span>
						</div>

						<!-- Legend -->
						<div class="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-emerald-500"></span> Good 7-9h
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-amber-500"></span> Poor 6-7h
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-full bg-red-500"></span> Awful &lt;6h
							</span>
							<span class="ml-auto">{sleepPoints.length} of {sleepDays} nights logged</span>
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
