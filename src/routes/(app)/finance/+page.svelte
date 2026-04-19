<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Button } from '$lib/components/ui/button';
	import { formatMoney } from '$lib/finance';

	let { data } = $props();

	const maxSpent = $derived(data.rows.reduce((m, r) => Math.max(m, r.spent, r.budget), 0));
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Dashboard</h2>
		<p class="text-sm text-muted-foreground">Spend + budget utilisation per category.</p>
	</div>
	<form method="GET" class="flex items-end gap-2">
		<div class="space-y-1">
			<Label for="month" class="text-xs">Month</Label>
			<Input id="month" name="month" type="month" value={data.yearMonth} class="w-40" />
		</div>
		<Button type="submit" variant="outline" size="sm">Go</Button>
	</form>
</header>

<div class="grid gap-3 sm:grid-cols-3">
	<Card.Root>
		<Card.Header>
			<Card.Description>Income</Card.Description>
			<Card.Title class="text-2xl text-emerald-600">{formatMoney(data.income)}</Card.Title>
		</Card.Header>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Description>Spend</Card.Description>
			<Card.Title class="text-2xl text-destructive">{formatMoney(data.expense)}</Card.Title>
		</Card.Header>
	</Card.Root>
	<Card.Root>
		<Card.Header>
			<Card.Description>Net</Card.Description>
			<Card.Title class={`text-2xl ${data.net < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
				{formatMoney(data.net, 'AUD', { showSign: true })}
			</Card.Title>
		</Card.Header>
	</Card.Root>
</div>

{#if data.rows.length === 0}
	<p class="text-sm text-muted-foreground">No transactions this month.</p>
{:else}
	<section class="space-y-3">
		<h3 class="text-sm font-semibold tracking-widest uppercase">By category</h3>
		<ul class="space-y-2">
			{#each data.rows as r (r.category_id ?? 'null')}
				{@const pct = maxSpent > 0 ? (r.spent / maxSpent) * 100 : 0}
				{@const budgetPct = r.budget > 0 ? Math.min(100, (r.spent / r.budget) * 100) : 0}
				{@const over = r.budget > 0 && r.spent > r.budget}
				<li class="grid grid-cols-[1fr_auto] items-center gap-3">
					<div>
						<div class="flex items-center gap-2 text-sm">
							{#if r.color}
								<span class="size-2.5 shrink-0 rounded-full" style={`background:${r.color}`}></span>
							{/if}
							<span class="font-medium">{r.name}</span>
							{#if r.budget > 0}
								<span class={`text-xs ${over ? 'text-destructive' : 'text-muted-foreground'}`}>
									{Math.round(budgetPct)}% of {formatMoney(r.budget)}
								</span>
							{/if}
						</div>
						<div class="relative mt-1 h-2 overflow-hidden rounded-full bg-muted">
							<div class="h-full bg-foreground/50 transition-all" style={`width:${pct}%`}></div>
							{#if r.budget > 0}
								<div
									class={`absolute top-0 h-full ${over ? 'bg-destructive/40' : 'bg-primary/40'}`}
									style={`left:0;width:${(r.budget / maxSpent) * 100}%`}
								></div>
							{/if}
						</div>
					</div>
					<span class="font-mono text-sm">{formatMoney(r.spent)}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}
