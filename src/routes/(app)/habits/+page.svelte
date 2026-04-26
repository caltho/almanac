<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Archive from '@lucide/svelte/icons/archive';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import { useUserData, type Habit } from '$lib/stores/userData.svelte';

	let { form } = $props();

	const userData = useUserData();
	const defs = $derived(userData.defsFor('habits'));

	const WEEK = 7;
	const days = $derived.by(() => {
		const out: string[] = [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		for (let i = 0; i < WEEK; i++) {
			const d = new Date(today);
			d.setDate(d.getDate() - i);
			out.push(d.toISOString().slice(0, 10));
		}
		return out;
	});

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
		const wasTicked = userData.habitTickedOn(habit_id, check_date);
		userData.toggleHabitCheck(habit_id, check_date, !wasTicked);
		try {
			const res = await fetch('/habits/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'toggle', habit_id, check_date, done: !wasTicked })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			userData.toggleHabitCheck(habit_id, check_date, wasTicked);
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
			// Re-fetch authoritative state on failure rather than guessing the
			// row's pre-archive position in the list.
			userData.habits = [...userData.habits, habit];
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

	{#if userData.habits.length === 0}
		<p class="text-sm text-muted-foreground">No habits yet.</p>
	{:else}
		<div class="rounded-md border">
			<div
				class="grid grid-cols-[1fr_auto_auto] gap-3 border-b px-3 py-2 text-xs tracking-wider text-muted-foreground uppercase"
			>
				<span>Habit</span>
				<div class="flex gap-1">
					{#each days.slice().reverse() as d (d)}
						<span class="grid w-7 place-items-center">{shortDay(d)}</span>
					{/each}
				</div>
				<span></span>
			</div>
			<ul class="divide-y divide-border">
				{#each userData.habits as h (h.id)}
					<li class="grid grid-cols-[1fr_auto_auto] items-start gap-3 p-3">
						<a href={`/habits/${h.id}`} class="min-w-0 space-y-1">
							<div class="font-medium">{h.name}</div>
							{#if h.description}
								<p class="line-clamp-1 text-xs text-muted-foreground">{h.description}</p>
							{/if}
							<AttrsRenderer {defs} values={h.custom as Record<string, unknown>} />
						</a>
						<div class="flex gap-1">
							{#each days.slice().reverse() as d (d)}
								{@const ticked = userData.habitTickedOn(h.id, d)}
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
							onclick={() => archive(h)}
						>
							<Archive class="size-4" />
						</Button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
