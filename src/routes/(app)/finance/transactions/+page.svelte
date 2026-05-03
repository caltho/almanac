<script lang="ts">
	import { enhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { formatMoney } from '$lib/finance';
	import { localIso } from '$lib/dates';

	let { data, form } = $props();

	const catMap = $derived(new Map(data.categories.map((c) => [c.id, c])));
</script>

<header class="flex items-start justify-between">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Transactions</h2>
		<p class="text-sm text-muted-foreground">Filter by month + category. Inline-change category.</p>
	</div>
</header>

<form method="GET" class="grid gap-3 sm:grid-cols-[auto_1fr_auto_auto]">
	<div class="space-y-1">
		<Label for="month">Month</Label>
		<Input id="month" name="month" type="month" value={data.filters.yearMonth} />
	</div>
	<div class="space-y-1">
		<Label for="q">Search</Label>
		<Input id="q" name="q" value={data.filters.q} placeholder="description contains…" />
	</div>
	<div class="space-y-1">
		<Label for="category">Category</Label>
		<select
			id="category"
			name="category"
			class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
		>
			<option value="">All</option>
			<option value="uncategorised" selected={data.filters.categoryFilter === 'uncategorised'}
				>Uncategorised</option
			>
			{#each data.categories as c (c.id)}
				<option value={c.id} selected={data.filters.categoryFilter === c.id}>{c.name}</option>
			{/each}
		</select>
	</div>
	<div class="flex items-end">
		<Button type="submit">Apply</Button>
	</div>
</form>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">Add transaction</Card.Title>
	</Card.Header>
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update }) =>
				await update({ reset: true })}
	>
		<Card.Content class="grid gap-3 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-end">
			<div class="space-y-1">
				<Label>Date</Label>
				<Input
					name="posted_at"
					type="date"
					value={localIso()}
					required
				/>
			</div>
			<div class="space-y-1">
				<Label>Description</Label>
				<Input name="description" required />
			</div>
			<div class="space-y-1">
				<Label>Amount</Label>
				<Input name="amount" type="number" step="0.01" required class="w-28" />
			</div>
			<div class="space-y-1">
				<Label>Category</Label>
				<select
					name="category_id"
					class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
				>
					<option value="">—</option>
					{#each data.categories as c (c.id)}
						<option value={c.id}>{c.name}</option>
					{/each}
				</select>
			</div>
			<Button type="submit">Add</Button>
			{#if form?.error}
				<p class="col-span-full text-sm text-destructive">{form.error}</p>
			{/if}
		</Card.Content>
	</form>
</Card.Root>

{#if data.transactions.length === 0}
	<p class="text-sm text-muted-foreground">Nothing for this period.</p>
{:else}
	<ul class="divide-y divide-border rounded-md border">
		{#each data.transactions as t (t.id)}
			{@const cat = t.category_id ? catMap.get(t.category_id) : null}
			<li class="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 p-3 text-sm">
				<time class="text-xs tracking-widest text-muted-foreground uppercase">{t.posted_at}</time>
				<div class="truncate">
					<div class="font-medium">{t.description}</div>
					<div class="text-[10px] tracking-wider text-muted-foreground uppercase">{t.source}</div>
				</div>
				<span class={`font-mono ${t.amount < 0 ? 'text-destructive' : 'text-emerald-600'}`}>
					{formatMoney(t.amount, t.currency, { showSign: true })}
				</span>
				<form method="POST" action="?/setCategory" use:enhance>
					<input type="hidden" name="id" value={t.id} />
					<select
						name="category_id"
						onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
						class="flex h-7 rounded-md border border-input bg-background px-2 text-xs"
						style={cat?.color ? `border-color:${cat.color}40` : ''}
					>
						<option value="">—</option>
						{#each data.categories as c (c.id)}
							<option value={c.id} selected={t.category_id === c.id}>{c.name}</option>
						{/each}
					</select>
				</form>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={t.id} />
					<Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete">
						<Trash2 class="size-4" />
					</Button>
				</form>
			</li>
		{/each}
	</ul>
{/if}
