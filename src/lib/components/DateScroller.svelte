<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	type Props = {
		selected: string;
		onchange: (iso: string) => void;
		activeDates?: Set<string>;
		days?: number;
		class?: string;
	};

	let {
		selected,
		onchange,
		activeDates,
		days = 14,
		class: className = ''
	}: Props = $props();

	import { localIso, localMidnight, dateFromIso } from '$lib/dates';

	const isoOf = localIso;
	const today = localMidnight();
	const todayIso = isoOf(today);

	let viewEnd = $state<Date>(today);

	$effect(() => {
		const sel = dateFromIso(selected);
		const start = new Date(viewEnd);
		start.setDate(start.getDate() - (days - 1));
		if (sel < start) {
			const newEnd = new Date(sel);
			newEnd.setDate(newEnd.getDate() + (days - 1));
			viewEnd = newEnd > today ? today : newEnd;
		} else if (sel > viewEnd) {
			viewEnd = sel > today ? today : sel;
		}
	});

	const windowDays = $derived.by(() => {
		const out: Date[] = [];
		for (let i = days - 1; i >= 0; i--) {
			const d = new Date(viewEnd);
			d.setDate(d.getDate() - i);
			out.push(d);
		}
		return out;
	});

	const atFutureEdge = $derived(isoOf(viewEnd) === todayIso);

	function shift(n: number) {
		const next = new Date(viewEnd);
		next.setDate(next.getDate() + n);
		viewEnd = next > today ? today : next;
	}
</script>

<div class={`flex items-center gap-1 ${className}`}>
	<button
		type="button"
		onclick={() => shift(-7)}
		class="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted"
		aria-label="Earlier dates"
	>
		<ChevronLeft class="size-4" />
	</button>

	<div class="flex flex-1 gap-1 overflow-x-auto">
		{#each windowDays as d (isoOf(d))}
			{@const iso = isoOf(d)}
			{@const isToday = iso === todayIso}
			{@const isSelected = iso === selected}
			{@const hasActivity = activeDates?.has(iso) ?? false}
			<button
				type="button"
				onclick={() => onchange(iso)}
				class={`relative flex flex-1 shrink-0 flex-col items-center gap-0.5 rounded-md border px-1.5 py-1.5 text-xs transition-colors ${
					isSelected
						? 'border-primary bg-primary text-primary-foreground'
						: isToday
							? 'border-primary/40 hover:bg-muted'
							: 'border-border hover:bg-muted'
				}`}
				aria-current={isSelected ? 'date' : undefined}
				aria-label={d.toLocaleDateString(undefined, {
					weekday: 'long',
					day: 'numeric',
					month: 'long'
				})}
			>
				<span class="text-[10px] tracking-wider uppercase opacity-80">
					{d.toLocaleDateString(undefined, { weekday: 'short' })}
				</span>
				<span class="text-base leading-none font-semibold">
					{d.getDate()}
				</span>
				<span
					class={`mt-0.5 size-1 rounded-full ${
						hasActivity
							? isSelected
								? 'bg-primary-foreground'
								: 'bg-primary'
							: 'bg-transparent'
					}`}
				></span>
			</button>
		{/each}
	</div>

	<button
		type="button"
		onclick={() => shift(7)}
		disabled={atFutureEdge}
		class="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
		aria-label="Later dates"
	>
		<ChevronRight class="size-4" />
	</button>
</div>
