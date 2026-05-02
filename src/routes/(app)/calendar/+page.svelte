<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { paletteHex } from '$lib/palette';
	import { useUserData } from '$lib/stores/userData.svelte';

	const userData = useUserData();

	// Selected month — defaults to current. Stored as a Date pinned to day 1.
	const today = (() => {
		const t = new Date();
		t.setHours(0, 0, 0, 0);
		return t;
	})();
	let viewYear = $state(today.getFullYear());
	let viewMonth = $state(today.getMonth()); // 0-11

	const monthLabel = $derived(
		new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		})
	);

	function shiftMonth(delta: number) {
		const d = new Date(viewYear, viewMonth + delta, 1);
		viewYear = d.getFullYear();
		viewMonth = d.getMonth();
	}
	function goToToday() {
		viewYear = today.getFullYear();
		viewMonth = today.getMonth();
	}

	// Build a 6×7 grid of days starting on Monday. Rows can spill into the
	// previous and next months — those cells are still tappable but visually
	// muted so the focus stays on the current month.
	type Cell = { date: Date; iso: string; inMonth: boolean };
	const grid = $derived.by((): Cell[][] => {
		const firstOfMonth = new Date(viewYear, viewMonth, 1);
		const dow = firstOfMonth.getDay() === 0 ? 7 : firstOfMonth.getDay(); // Mon=1..Sun=7
		const start = new Date(firstOfMonth);
		start.setDate(start.getDate() - (dow - 1));
		const rows: Cell[][] = [];
		for (let r = 0; r < 6; r++) {
			const row: Cell[] = [];
			for (let c = 0; c < 7; c++) {
				const d = new Date(start);
				d.setDate(start.getDate() + r * 7 + c);
				row.push({
					date: d,
					iso: d.toISOString().slice(0, 10),
					inMonth: d.getMonth() === viewMonth
				});
			}
			rows.push(row);
		}
		return rows;
	});

	// Bucket events + birthdays by ISO date for fast cell lookup. Birthdays
	// expand into the current view-year so they show up regardless of stored
	// year value.
	const eventsByDay = $derived.by(() => {
		const map = new Map<string, typeof userData.events>();
		for (const e of userData.events) {
			const iso = e.start_at.slice(0, 10);
			const list = map.get(iso) ?? [];
			list.push(e);
			map.set(iso, list);
		}
		return map;
	});

	const birthdaysByMonthDay = $derived.by(() => {
		const map = new Map<string, typeof userData.birthdays>();
		for (const b of userData.birthdays) {
			const key = `${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`;
			const list = map.get(key) ?? [];
			list.push(b);
			map.set(key, list);
		}
		return map;
	});

	function birthdaysFor(d: Date) {
		const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		return birthdaysByMonthDay.get(key) ?? [];
	}

	// Selected day — default to today, click any cell to refocus the side
	// panel. Stored as ISO so $derived recomputes cleanly.
	let selectedIso = $state(today.toISOString().slice(0, 10));
	const selectedDate = $derived.by(() => {
		const [y, m, d] = selectedIso.split('-').map(Number);
		return new Date(y, m - 1, d);
	});
	const selectedEvents = $derived(eventsByDay.get(selectedIso) ?? []);
	const selectedBirthdays = $derived(birthdaysFor(selectedDate));

	const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	function fmtTime(iso: string, allDay: boolean) {
		if (allDay) return 'All day';
		return new Date(iso).toLocaleTimeString(undefined, {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
	function fmtSelectedHeader(d: Date) {
		return d.toLocaleDateString(undefined, {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}
	function ageOn(year: number, _onDate: Date): number {
		return _onDate.getFullYear() - year;
	}
</script>

<header class="flex flex-wrap items-center justify-between gap-2">
	<div class="flex items-center gap-1">
		<Button variant="ghost" size="icon-sm" onclick={() => shiftMonth(-1)} aria-label="Previous month">
			<ChevronLeft class="size-4" />
		</Button>
		<h1 class="px-1 text-xl font-semibold tracking-tight tabular-nums">{monthLabel}</h1>
		<Button variant="ghost" size="icon-sm" onclick={() => shiftMonth(1)} aria-label="Next month">
			<ChevronRight class="size-4" />
		</Button>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" onclick={goToToday}>Today</Button>
		<Button size="sm" href="/calendar/events">New event</Button>
	</div>
</header>

<div class="grid gap-4 lg:grid-cols-[1fr_280px]">
	<!-- Month grid -->
	<div class="space-y-1">
		<div class="grid grid-cols-7 gap-1 text-[10px] tracking-widest text-muted-foreground uppercase">
			{#each WEEKDAYS as w (w)}
				<div class="text-center">{w}</div>
			{/each}
		</div>
		<div class="grid grid-cols-7 gap-1">
			{#each grid as row, r (r)}
				{#each row as cell (cell.iso)}
					{@const evs = eventsByDay.get(cell.iso) ?? []}
					{@const bds = birthdaysFor(cell.date)}
					{@const isToday = cell.iso === today.toISOString().slice(0, 10)}
					{@const isSelected = cell.iso === selectedIso}
					<button
						type="button"
						onclick={() => (selectedIso = cell.iso)}
						class={`relative flex aspect-square min-h-[56px] flex-col items-stretch gap-0.5 rounded-md border p-1 text-left transition-colors sm:aspect-auto sm:min-h-[80px] ${
							isSelected
								? 'border-foreground bg-muted/50'
								: cell.inMonth
									? 'border-border hover:bg-muted/30'
									: 'border-border/40 bg-muted/10 text-muted-foreground/60 hover:bg-muted/20'
						}`}
						aria-current={isToday ? 'date' : undefined}
					>
						<span
							class={`text-xs tabular-nums ${
								isToday
									? 'inline-grid size-5 place-items-center self-start rounded-full bg-primary text-primary-foreground font-semibold'
									: 'self-start font-medium'
							}`}
						>
							{cell.date.getDate()}
						</span>
						<div class="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
							{#each evs.slice(0, 2) as e (e.id)}
								{@const hex = paletteHex(e.color) ?? '#0072B2'}
								<span
									class="truncate rounded px-1 text-[10px] leading-tight text-white"
									style={`background:${hex}`}
								>
									{#if !e.all_day}<span class="opacity-80"
											>{fmtTime(e.start_at, false)} </span
										>{/if}{e.title}
								</span>
							{/each}
							{#if bds.length > 0}
								<span class="truncate text-[10px] leading-tight text-muted-foreground">
									🎂 {bds.map((b) => b.name).join(', ')}
								</span>
							{/if}
							{#if evs.length > 2}
								<span class="text-[10px] text-muted-foreground">+{evs.length - 2} more</span>
							{/if}
						</div>
					</button>
				{/each}
			{/each}
		</div>
	</div>

	<!-- Selected-day side panel -->
	<aside class="space-y-3">
		<div class="space-y-0.5">
			<div class="text-[10px] tracking-widest text-muted-foreground uppercase">Selected</div>
			<h2 class="text-base font-semibold tracking-tight">{fmtSelectedHeader(selectedDate)}</h2>
		</div>

		{#if selectedEvents.length === 0 && selectedBirthdays.length === 0}
			<p class="text-sm text-muted-foreground">Nothing scheduled.</p>
		{/if}

		{#if selectedEvents.length > 0}
			<section class="space-y-1.5">
				<h3 class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Events
				</h3>
				<ul class="space-y-1.5">
					{#each selectedEvents as e (e.id)}
						{@const hex = paletteHex(e.color) ?? '#0072B2'}
						<li class="flex gap-2 rounded-md border p-2">
							<span
								class="mt-0.5 size-2 shrink-0 rounded-full"
								style={`background:${hex}`}
								aria-hidden="true"
							></span>
							<div class="min-w-0 flex-1 space-y-0.5">
								<div class="text-sm font-medium leading-snug">{e.title}</div>
								<div class="text-xs text-muted-foreground">
									{fmtTime(e.start_at, e.all_day)}
									{#if e.location}
										· {e.location}
									{/if}
								</div>
								{#if e.description}
									<p class="text-xs text-muted-foreground">{e.description}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if selectedBirthdays.length > 0}
			<section class="space-y-1.5">
				<h3 class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Birthdays
				</h3>
				<ul class="space-y-1.5">
					{#each selectedBirthdays as b (b.id)}
						{@const hex = paletteHex(b.color) ?? '#CC79A7'}
						<li class="flex gap-2 rounded-md border p-2">
							<span
								class="mt-0.5 size-2 shrink-0 rounded-full"
								style={`background:${hex}`}
								aria-hidden="true"
							></span>
							<div class="min-w-0 flex-1">
								<div class="text-sm font-medium leading-snug">
									🎂 {b.name}{#if b.year}
										<span class="text-xs text-muted-foreground tabular-nums">
											· turns {ageOn(b.year, selectedDate)}
										</span>
									{/if}
								</div>
								{#if b.notes}
									<p class="text-xs text-muted-foreground">{b.notes}</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	</aside>
</div>
