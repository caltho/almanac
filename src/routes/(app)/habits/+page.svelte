<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Archive from '@lucide/svelte/icons/archive';
	import Settings2 from '@lucide/svelte/icons/settings-2';

	let { data, form } = $props();

	// Local, optimistic copy of the checks map. Seeded from server data on first
	// render; mutated immediately on click, posted in the background. See
	// /habits/api/+server.ts for the rollback story on error.
	// svelte-ignore state_referenced_locally
	let ticksLocal = $state<Record<string, Set<string>>>(
		Object.fromEntries(Object.entries(data.ticks).map(([k, v]) => [k, new Set(v as string[])]))
	);
	// svelte-ignore state_referenced_locally
	let habitsLocal = $state(data.habits);

	let adding = $state(false);

	const CADENCES = [
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekdays', label: 'Weekdays' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' }
	];

	function shortDay(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
	}

	async function toggle(habit_id: string, check_date: string) {
		const set = ticksLocal[habit_id] ?? new Set<string>();
		const wasTicked = set.has(check_date);
		// Optimistic flip
		if (wasTicked) set.delete(check_date);
		else set.add(check_date);
		ticksLocal = { ...ticksLocal, [habit_id]: new Set(set) };

		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggle', habit_id, check_date, done: !wasTicked })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			// Rollback on failure
			if (wasTicked) set.add(check_date);
			else set.delete(check_date);
			ticksLocal = { ...ticksLocal, [habit_id]: new Set(set) };
		}
	}

	async function archive(habit_id: string) {
		const prev = habitsLocal;
		habitsLocal = habitsLocal.filter((h) => h.id !== habit_id);
		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'archive', habit_id })
			});
			if (!res.ok) throw new Error();
		} catch {
			habitsLocal = prev;
		}
	}
</script>

<section class="space-y-6">
	<header class="flex items-start justify-between gap-4">
		<div class="space-y-1">
			<h1 class="text-2xl font-semibold tracking-tight">Habits</h1>
			<p class="text-sm text-muted-foreground">Tap a day to tick. Last 7 days.</p>
		</div>
		<Button variant="outline" size="sm" href="/habits/fields">
			<Settings2 class="size-4" />
			<span>Fields</span>
		</Button>
	</header>

	<Card.Root>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				adding = true;
				return async ({ update }) => {
					await update({ reset: true });
					adding = false;
				};
			}}
		>
			<Card.Content class="grid gap-3 pt-6 sm:grid-cols-[1fr_auto_auto]">
				<Input name="name" placeholder="New habit…" required />
				<select
					name="cadence"
					class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs sm:w-36"
				>
					{#each CADENCES as c (c.value)}
						<option value={c.value}>{c.label}</option>
					{/each}
				</select>
				<Button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add habit'}</Button>
				{#if form?.error}
					<p class="col-span-full text-sm text-destructive">{form.error}</p>
				{/if}
			</Card.Content>
		</form>
	</Card.Root>

	{#if habitsLocal.length === 0}
		<p class="text-sm text-muted-foreground">No habits yet.</p>
	{:else}
		<div class="rounded-md border">
			<div
				class="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-2 text-xs tracking-wider text-muted-foreground uppercase"
			>
				<span>Habit</span>
				<div class="flex gap-1">
					{#each data.days.slice().reverse() as d (d)}
						<span class="grid w-7 place-items-center">{shortDay(d)}</span>
					{/each}
				</div>
				<span></span>
			</div>
			<ul class="divide-y divide-border">
				{#each habitsLocal as h (h.id)}
					{@const set = ticksLocal[h.id] ?? new Set<string>()}
					<li class="grid grid-cols-[1fr_auto_auto] items-start gap-3 p-3">
						<a href={`/habits/${h.id}`} class="min-w-0 space-y-1">
							<div class="font-medium">{h.name}</div>
							{#if h.description}
								<p class="line-clamp-1 text-xs text-muted-foreground">{h.description}</p>
							{/if}
							<AttrsRenderer defs={data.defs} values={h.custom as Record<string, unknown>} />
						</a>
						<div class="flex gap-1">
							{#each data.days.slice().reverse() as d (d)}
								{@const ticked = set.has(d)}
								<button
									type="button"
									onclick={() => toggle(h.id, d)}
									class={`grid size-7 place-items-center rounded border text-xs transition-colors ${
										ticked
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-border hover:bg-muted'
									}`}
									aria-label={`Toggle ${h.name} for ${d}`}
								>
									{#if ticked}✓{/if}
								</button>
							{/each}
						</div>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Archive"
							onclick={() => archive(h.id)}
						>
							<Archive class="size-4" />
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
