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

	const catMap = $derived(new Map(data.categories.map((c) => [c.id, c])));
</script>

<header class="space-y-1">
	<h2 class="text-xl font-semibold tracking-tight">Budgets</h2>
	<p class="text-sm text-muted-foreground">Monthly utilisation based on this month's spend.</p>
</header>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">Set budget</Card.Title>
	</Card.Header>
	<form
		method="POST"
		action="?/upsert"
		use:enhance={() =>
			async ({ update }) =>
				await update({ reset: true })}
	>
		<Card.Content class="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
			<div class="space-y-2">
				<Label for="category_id">Category</Label>
				<select
					id="category_id"
					name="category_id"
					required
					class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">Pick one…</option>
					{#each data.categories as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<div class="space-y-2">
				<Label for="period">Period</Label>
				<select
					id="period"
					name="period"
					class="flex h-9 w-32 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="monthly">Monthly</option>
					<option value="weekly">Weekly</option>
					<option value="yearly">Yearly</option>
				</select>
			</div>
			<div class="space-y-2">
				<Label for="amount">Amount</Label>
				<Input id="amount" name="amount" type="number" step="0.01" min="0" required class="w-32" />
			</div>
			<Button type="submit">Save</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if data.budgets.length === 0}
	<p class="text-sm text-muted-foreground">No budgets set.</p>
{:else}
	<ul class="divide-y divide-border rounded-md border">
		{#each data.budgets as b (b.id)}
			{@const cat = catMap.get(b.category_id)}
			{@const spent = data.spendMap[b.category_id] ?? 0}
			{@const pct = b.amount > 0 ? Math.min(100, Math.round((spent / b.amount) * 100)) : 0}
			{@const over = spent > b.amount}
			<li class="space-y-2 p-4">
				<div class="flex flex-wrap items-center gap-3">
					{#if cat?.color}
						<span class="size-3 shrink-0 rounded-full" style={`background:${cat.color}`}></span>
					{/if}
					<span class="font-medium">{cat?.name ?? '—'}</span>
					<Badge variant="secondary" class="text-[10px] capitalize">{b.period}</Badge>
					<span class="ml-auto text-sm">
						<strong class={over ? 'text-destructive' : ''}>{formatMoney(spent, b.currency)}</strong>
						<span class="text-muted-foreground"> / {formatMoney(b.amount, b.currency)}</span>
					</span>
					<form method="POST" action="?/delete" use:enhance>
						<input type="hidden" name="id" value={b.id} />
						<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
							<Trash2 class="size-4" />
						</Button>
					</form>
				</div>
				<div class="h-2 overflow-hidden rounded-full bg-muted">
					<div
						class={`h-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
						style={`width:${pct}%`}
					></div>
				</div>
			</li>
		{/each}
	</ul>
{/if}
