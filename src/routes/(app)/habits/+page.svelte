<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { AttrsRenderer } from '$lib/custom-attrs';
	import Archive from '@lucide/svelte/icons/archive';
	import Settings2 from '@lucide/svelte/icons/settings-2';

	let { data, form } = $props();

	let adding = $state(false);

	function shortDay(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' });
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
				<Input name="cadence" placeholder="daily" class="sm:w-32" />
				<Button type="submit" disabled={adding}>{adding ? 'Adding…' : 'Add habit'}</Button>
				{#if form?.error}
					<p class="col-span-full text-sm text-destructive">{form.error}</p>
				{/if}
			</Card.Content>
		</form>
	</Card.Root>

	{#if data.habits.length === 0}
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
				{#each data.habits as h (h.id)}
					{@const set = new Set(data.ticks[h.id] ?? [])}
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
								<form method="POST" action="?/toggle" use:enhance class="inline">
									<input type="hidden" name="habit_id" value={h.id} />
									<input type="hidden" name="check_date" value={d} />
									<button
										type="submit"
										class={`grid size-7 place-items-center rounded border text-xs transition-colors ${
											ticked
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-border hover:bg-muted'
										}`}
										aria-label={`Toggle ${h.name} for ${d}`}
									>
										{#if ticked}✓{/if}
									</button>
								</form>
							{/each}
						</div>
						<form method="POST" action="?/archive" use:enhance>
							<input type="hidden" name="id" value={h.id} />
							<Button type="submit" variant="ghost" size="icon-sm" aria-label="Archive">
								<Archive class="size-4" />
							</Button>
						</form>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</section>
