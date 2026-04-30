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

	// Last 14 nights of sleep, oldest → newest. Missing days render as gaps.
	const sleepDays = 14;
	const sleepSeries = $derived.by(() => {
		const byDate = new Map<string, number>();
		for (const s of userData.sleepLogs) {
			if (typeof s.hours_slept === 'number') byDate.set(s.log_date, s.hours_slept);
		}
		const out: { date: string; hours: number | null }[] = [];
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		for (let i = sleepDays - 1; i >= 0; i--) {
			const d = new Date(t);
			d.setDate(d.getDate() - i);
			const iso = d.toISOString().slice(0, 10);
			out.push({ date: iso, hours: byDate.get(iso) ?? null });
		}
		return out;
	});

	const sleepAvg = $derived.by(() => {
		const vals = sleepSeries.map((d) => d.hours).filter((v): v is number => v !== null);
		if (vals.length === 0) return null;
		return vals.reduce((a, b) => a + b, 0) / vals.length;
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
			const res = await fetch('/tracking/habits/api', {
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
				<Button href="/tracking/habits" variant="ghost" size="sm">All</Button>
			</Card.Header>
			<Card.Content>
				{#if userData.habits.length === 0}
					<p class="text-sm text-muted-foreground">
						No habits yet. <a class="underline" href="/tracking/habits">Add one</a>.
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
				{#if sleepSeries.every((d) => d.hours === null)}
					<p class="text-sm text-muted-foreground">
						<a class="underline" href="/sleep">Log your first night</a> to start the chart.
					</p>
				{:else}
					{@const yMax = 12}
					{@const chartH = 140}
					{@const barW = 100 / sleepDays}
					<div class="space-y-2">
						<div class="relative" style={`height: ${chartH}px`}>
							<!-- Band shading: green 7-9, amber 6-7, red <6 -->
							<div
								class="absolute inset-x-0 bg-emerald-500/10"
								style={`top: ${((yMax - 9) / yMax) * 100}%; height: ${(2 / yMax) * 100}%`}
								aria-hidden="true"
							></div>
							<div
								class="absolute inset-x-0 bg-amber-500/10"
								style={`top: ${((yMax - 7) / yMax) * 100}%; height: ${(1 / yMax) * 100}%`}
								aria-hidden="true"
							></div>
							<div
								class="absolute inset-x-0 bg-red-500/10"
								style={`top: ${((yMax - 6) / yMax) * 100}%; height: ${(6 / yMax) * 100}%`}
								aria-hidden="true"
							></div>
							<!-- Average reference line -->
							{#if sleepAvg !== null}
								<div
									class="absolute inset-x-0 border-t border-dashed border-foreground/40"
									style={`top: ${((yMax - sleepAvg) / yMax) * 100}%`}
									aria-hidden="true"
								></div>
								<span
									class="absolute right-1 -translate-y-full text-[10px] text-muted-foreground"
									style={`top: ${((yMax - sleepAvg) / yMax) * 100}%`}
								>
									avg {sleepAvg.toFixed(1)}h
								</span>
							{/if}
							<!-- Bars -->
							<div class="absolute inset-0 flex items-end gap-[2px] px-[1px]">
								{#each sleepSeries as d (d.date)}
									{@const h = d.hours ?? 0}
									{@const heightPct = d.hours === null ? 0 : (h / yMax) * 100}
									<div
										class="relative flex-1"
										style={`flex-basis: ${barW}%`}
										title={d.hours === null
											? `${d.date}: no log`
											: `${d.date}: ${h}h (${sleepBandLabel(h)})`}
									>
										{#if d.hours !== null}
											<div
												class="absolute bottom-0 w-full rounded-t"
												style={`height: ${heightPct}%; background: ${sleepBandColor(h)}`}
											></div>
										{:else}
											<div
												class="absolute bottom-0 h-1 w-full rounded-t bg-muted-foreground/15"
											></div>
										{/if}
									</div>
								{/each}
							</div>
						</div>
						<!-- Day labels: show every 2nd day -->
						<div class="flex gap-[2px] px-[1px] text-[10px] text-muted-foreground">
							{#each sleepSeries as d, i (d.date)}
								<div class="flex-1 text-center" style={`flex-basis: ${barW}%`}>
									{i % 2 === 0 ? new Date(d.date + 'T00:00:00').getDate() : ''}
								</div>
							{/each}
						</div>
						<!-- Legend -->
						<div class="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-sm bg-emerald-500"></span> Good 7-9h
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-sm bg-amber-500"></span> Poor 6-7h
							</span>
							<span class="inline-flex items-center gap-1.5">
								<span class="size-2 rounded-sm bg-red-500"></span> Awful &lt;6h
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
