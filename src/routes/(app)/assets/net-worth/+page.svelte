<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { formatMoney } from '$lib/finance';

	let { data, form } = $props();

	// SVG line chart over snapshot history.
	const chart = $derived.by(() => {
		const snaps = data.snapshots;
		if (snaps.length < 1) return null;
		const values = snaps.map((s) => s.total_value);
		const min = Math.min(...values, 0);
		const max = Math.max(...values);
		const range = max - min || 1;
		const w = 600;
		const h = 120;
		const pad = 6;
		const step = snaps.length > 1 ? (w - pad * 2) / (snaps.length - 1) : 0;
		const points = snaps.map((s, i) => {
			const x = pad + i * step;
			const y = h - pad - ((s.total_value - min) / range) * (h - pad * 2);
			return { x, y, total: s.total_value, date: s.snapshot_date };
		});
		const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
		return { d, points, w, h };
	});

	const last = $derived(data.snapshots.at(-1));
	const previous = $derived(data.snapshots.at(-2));
	const delta = $derived(last && previous ? last.total_value - previous.total_value : 0);
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Net worth</h2>
		<p class="text-sm text-muted-foreground">
			Aggregate asset value over time. Snapshots are dated.
		</p>
	</div>
</header>

<Card.Root>
	<Card.Header>
		<Card.Description>Right now</Card.Description>
		<Card.Title class="text-3xl">{formatMoney(data.current.total)}</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-wrap gap-2 text-xs">
		{#each Object.entries(data.current.breakdown) as [k, v] (k)}
			<Badge variant="outline">{k}: {formatMoney(v as number)}</Badge>
		{/each}
	</Card.Content>
	<form method="POST" action="?/takeSnapshot" use:enhance>
		<Card.Footer class="gap-2">
			<Input name="note" placeholder="Note (optional)" class="max-w-xs" />
			<Button type="submit">Snapshot today</Button>
			{#if form?.error}
				<p class="text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Footer>
	</form>
</Card.Root>

{#if chart}
	<Card.Root>
		<Card.Header class="flex-row items-center justify-between">
			<div>
				<Card.Description>Latest snapshot</Card.Description>
				<Card.Title class="text-2xl">{formatMoney(last?.total_value ?? 0)}</Card.Title>
			</div>
			{#if delta !== 0}
				<Badge variant={delta >= 0 ? 'secondary' : 'outline'} class="text-sm">
					{delta >= 0 ? '+' : ''}{formatMoney(delta, 'AUD')} vs prior
				</Badge>
			{/if}
		</Card.Header>
		<Card.Content>
			<svg viewBox={`0 0 ${chart.w} ${chart.h}`} class="h-28 w-full text-primary">
				<path d={chart.d} fill="none" stroke="currentColor" stroke-width="2" />
				{#each chart.points as p (p.date)}
					<circle cx={p.x} cy={p.y} r="2.5" fill="currentColor" />
				{/each}
			</svg>
		</Card.Content>
	</Card.Root>
{/if}

{#if data.snapshots.length === 0}
	<p class="text-sm text-muted-foreground">No snapshots yet.</p>
{:else}
	<ul class="divide-y divide-border rounded-md border">
		{#each [...data.snapshots].reverse() as s (s.id)}
			<li class="flex items-center justify-between p-3 text-sm">
				<div class="space-y-1">
					<div class="font-medium">
						{s.snapshot_date} — {formatMoney(s.total_value, s.currency)}
					</div>
					{#if s.note}<p class="text-xs text-muted-foreground">{s.note}</p>{/if}
				</div>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={s.id} />
					<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
						<Trash2 class="size-4" />
					</Button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
