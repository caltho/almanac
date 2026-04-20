<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { formatMoney } from '$lib/finance';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	import Moon from '@lucide/svelte/icons/moon';
	import Repeat from '@lucide/svelte/icons/repeat';
	import Wallet from '@lucide/svelte/icons/wallet';

	let { data } = $props();
	const name = $derived(data.profile?.display_name ?? data.user?.email?.split('@')[0] ?? 'you');

	// Today's habits as local optimistic state so ticks feel instant.
	// svelte-ignore state_referenced_locally
	let tickedToday = $state(new Set<string>(data.tickedToday));

	async function toggleHabit(habit_id: string) {
		const has = tickedToday.has(habit_id);
		if (has) tickedToday.delete(habit_id);
		else tickedToday.add(habit_id);
		tickedToday = new Set(tickedToday);
		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggle', habit_id, check_date: data.today, done: !has })
			});
			if (!res.ok) throw new Error();
		} catch {
			if (has) tickedToday.add(habit_id);
			else tickedToday.delete(habit_id);
			tickedToday = new Set(tickedToday);
		}
	}

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
</script>

<section class="space-y-6">
	<header class="space-y-1">
		<h1 class="text-3xl font-semibold tracking-tight">Hey {name}.</h1>
		<p class="text-sm text-muted-foreground">{fmtDate(data.today)}.</p>
	</header>

	<div class="grid gap-4 md:grid-cols-2">
		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<Repeat class="size-4" />
					<Card.Title class="text-base">Today's habits</Card.Title>
				</div>
				<Button href="/habits" variant="ghost" size="sm">All</Button>
			</Card.Header>
			<Card.Content>
				{#if data.habits.length === 0}
					<p class="text-sm text-muted-foreground">
						No habits yet. <a class="underline" href="/habits">Add one</a>.
					</p>
				{:else}
					<ul class="space-y-1">
						{#each data.habits as h (h.id)}
							{@const ticked = tickedToday.has(h.id)}
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
				{#if data.openTasks.length === 0}
					<p class="text-sm text-muted-foreground">Nothing on the list. 🎉</p>
				{:else}
					<ul class="-my-1 divide-y divide-border">
						{#each data.openTasks as t (t.id)}
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

		<Card.Root>
			<Card.Header class="flex-row items-center justify-between">
				<div class="flex items-center gap-2">
					<Moon class="size-4" />
					<Card.Title class="text-base">Last sleep</Card.Title>
				</div>
				<Button href="/sleep" variant="ghost" size="sm">Log</Button>
			</Card.Header>
			<Card.Content class="space-y-1">
				{#if data.lastSleep}
					<div class="flex items-baseline gap-3">
						<span class="text-2xl font-semibold">
							{data.lastSleep.hours_slept ?? '—'}<span class="ml-0.5 text-sm text-muted-foreground"
								>h</span
							>
						</span>
						{#if typeof data.lastSleep.quality === 'number'}
							<Badge variant="secondary" class="text-xs">Quality {data.lastSleep.quality}/10</Badge>
						{/if}
					</div>
					<div class="text-xs text-muted-foreground">{fmtDate(data.lastSleep.log_date)}</div>
				{:else}
					<p class="text-sm text-muted-foreground">Nothing logged yet.</p>
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
					<span class="text-emerald-600">+{formatMoney(data.finance.income)}</span>
					<span class="text-destructive">−{formatMoney(data.finance.spend)}</span>
				</div>
				<div
					class={`text-2xl font-semibold ${data.finance.net < 0 ? 'text-destructive' : 'text-emerald-600'}`}
				>
					{formatMoney(data.finance.net, 'AUD', { showSign: true })}
				</div>
				<div class="text-xs text-muted-foreground">{data.finance.yearMonth} · net</div>
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
			{#if data.recentJournal.length === 0}
				<p class="text-sm text-muted-foreground">
					<a class="underline" href="/journal/new">Write the first entry</a>.
				</p>
			{:else}
				<ul class="-my-1 divide-y divide-border">
					{#each data.recentJournal as e (e.id)}
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
