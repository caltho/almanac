<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import Plus from '@lucide/svelte/icons/plus';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import Archive from '@lucide/svelte/icons/archive';
	import { useUserData, type ShoppingItem } from '$lib/stores/userData.svelte';
	import {
		PERIOD_LABELS,
		SHOPPING_PERIODS,
		nextRestockAt,
		relativeDays,
		visualState,
		type ShoppingPeriod,
		type ShoppingStatus,
		type ShoppingVisual
	} from '$lib/shopping';

	let { form } = $props();

	const userData = useUserData();
	let showNew = $state(false);
	let busy = $state<Record<string, boolean>>({});

	// Annotate every item with its derived visual state + a numeric "overdue
	// score" we sort by inside the Reminder section.
	type Annotated = {
		item: ShoppingItem;
		visual: ShoppingVisual;
		nextAt: Date | null;
	};

	const annotated = $derived.by((): Annotated[] => {
		return userData.shoppingItems.map((item) => ({
			item,
			visual: visualState({
				status: item.status,
				restock_period: item.restock_period,
				last_purchased_at: item.last_purchased_at
			}),
			nextAt: nextRestockAt(item.last_purchased_at, item.restock_period)
		}));
	});

	const grouped = $derived.by(() => {
		const buy = annotated.filter((a) => a.visual === 'buy');
		const reminder = annotated
			.filter((a) => a.visual === 'reminder')
			.slice()
			.sort(
				(a, b) =>
					(a.nextAt?.getTime() ?? Infinity) - (b.nextAt?.getTime() ?? Infinity)
			);
		// Stocked: oldest purchase first (closest to needing restock).
		const stocked = annotated
			.filter((a) => a.visual === 'stocked')
			.slice()
			.sort((a, b) => {
				const at = a.item.last_purchased_at
					? new Date(a.item.last_purchased_at).getTime()
					: 0;
				const bt = b.item.last_purchased_at
					? new Date(b.item.last_purchased_at).getTime()
					: 0;
				return at - bt;
			});
		return { buy, reminder, stocked };
	});

	async function setStatus(item: ShoppingItem, next: ShoppingStatus) {
		busy[item.id] = true;
		const prev = { ...item };
		const optimistic: Partial<ShoppingItem> = { status: next };
		if (next === 'stocked') optimistic.last_purchased_at = new Date().toISOString();
		userData.updateShoppingItem(item.id, optimistic);

		try {
			const res = await fetch('/tasks/shopping/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setStatus', id: item.id, status: next })
			});
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { item: ShoppingItem };
			userData.updateShoppingItem(item.id, body.item);
		} catch {
			userData.updateShoppingItem(item.id, prev);
		} finally {
			busy[item.id] = false;
		}
	}

	/**
	 * Click handler on the multi-state status button. Cycles:
	 *   Buy       → Stocked (server stamps last_purchased_at)
	 *   Stocked   → Buy
	 *   Reminder  → Stocked (re-stamps last_purchased_at — a fresh restock cycle)
	 */
	function cycleStatus(a: Annotated) {
		if (a.visual === 'buy') return setStatus(a.item, 'stocked');
		// Stocked or Reminder → flip target depends on visual.
		if (a.visual === 'reminder') return setStatus(a.item, 'stocked');
		return setStatus(a.item, 'buy');
	}

	async function setPeriod(item: ShoppingItem, period: ShoppingPeriod) {
		const prev = { ...item };
		userData.updateShoppingItem(item.id, { restock_period: period });
		try {
			const res = await fetch('/tasks/shopping/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setPeriod', id: item.id, restock_period: period })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			userData.updateShoppingItem(item.id, prev);
		}
	}

	async function archive(item: ShoppingItem) {
		const prev = item;
		userData.removeShoppingItem(item.id);
		try {
			const fd = new FormData();
			fd.set('id', item.id);
			const res = await fetch('?/archive', { method: 'POST', body: fd });
			if (!res.ok) throw new Error();
		} catch {
			userData.addShoppingItem(prev);
		}
	}

	function lastPurchasedLabel(at: string | null): string {
		if (!at) return 'Never bought';
		return `Bought ${relativeDays(new Date(at))}`;
	}

	function nextDueLabel(a: Annotated): string {
		if (!a.nextAt) return '';
		return a.visual === 'reminder'
			? `Due ${relativeDays(a.nextAt)}`
			: `Due ${relativeDays(a.nextAt)}`;
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Shopping</h2>
		<p class="text-sm text-muted-foreground">
			What's on the next shop, plus the stuff you restock on a schedule.
		</p>
	</div>
	<Button size="sm" onclick={() => (showNew = !showNew)}>
		<Plus class="size-4" />
		<span>{showNew ? 'Close' : 'Add item'}</span>
	</Button>
</header>

{#if showNew}
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ update, result }) => {
				await update({ reset: true });
				if (result.type === 'success') showNew = false;
			}}
		class="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end"
	>
		<Input name="name" placeholder="What do you need to buy?" required autofocus />
		<select
			name="restock_period"
			class="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs sm:w-36"
		>
			{#each SHOPPING_PERIODS as p (p)}
				<option value={p} selected={p === 'monthly'}>{PERIOD_LABELS[p]}</option>
			{/each}
		</select>
		<Button type="submit">Add</Button>
		{#if form?.error}
			<p class="col-span-full text-sm text-destructive">{form.error}</p>
		{/if}
	</form>
{/if}

{#if userData.shoppingItems.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<ShoppingCart class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			Nothing on the list. <button class="underline" onclick={() => (showNew = true)}>
				Add an item
			</button>.
		</p>
	</div>
{:else}
	<!-- Buy -->
	{#if grouped.buy.length > 0}
		<section class="space-y-2">
			<h3 class="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
				<ShoppingCart class="size-3.5" />
				Buy at next shop · {grouped.buy.length}
			</h3>
			<ul class="divide-y divide-border rounded-lg border">
				{#each grouped.buy as a (a.item.id)}
					{@render row(a)}
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Reminder -->
	{#if grouped.reminder.length > 0}
		<section class="space-y-2">
			<h3
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-amber-600 uppercase dark:text-amber-400"
			>
				<Bell class="size-3.5" />
				Reminder · {grouped.reminder.length}
			</h3>
			<ul
				class="divide-y divide-border rounded-lg border border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5"
			>
				{#each grouped.reminder as a (a.item.id)}
					{@render row(a)}
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Stocked, sorted by last-purchased ascending -->
	{#if grouped.stocked.length > 0}
		<section class="space-y-2">
			<h3 class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
				<Check class="size-3.5" />
				Stocked · {grouped.stocked.length}
			</h3>
			<ul class="divide-y divide-border rounded-lg border">
				{#each grouped.stocked as a (a.item.id)}
					{@render row(a)}
				{/each}
			</ul>
		</section>
	{/if}
{/if}

{#snippet row(a: Annotated)}
	{@const item = a.item}
	{@const v = a.visual}
	<li class="grid grid-cols-[1fr_auto] items-center gap-3 p-3 sm:grid-cols-[1fr_auto_auto]">
		<div class="min-w-0 space-y-1">
			<div class="font-medium">{item.name}</div>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
				<span>{lastPurchasedLabel(item.last_purchased_at)}</span>
				{#if item.last_purchased_at && v !== 'buy'}
					<span aria-hidden="true">·</span>
					<span>{nextDueLabel(a)}</span>
				{/if}
			</div>
		</div>

		<select
			value={item.restock_period}
			onchange={(e) => setPeriod(item, (e.currentTarget as HTMLSelectElement).value as ShoppingPeriod)}
			class="hidden h-8 rounded-md border border-input bg-background px-2 text-xs shadow-xs sm:flex"
			aria-label="Restock period"
		>
			{#each SHOPPING_PERIODS as p (p)}
				<option value={p}>{PERIOD_LABELS[p]}</option>
			{/each}
		</select>

		<div class="flex items-center gap-1">
			<Button
				onclick={() => cycleStatus(a)}
				size="sm"
				variant={v === 'stocked' ? 'outline' : 'default'}
				disabled={busy[item.id]}
				title={
					v === 'buy'
						? 'Click when bought'
						: v === 'reminder'
							? 'Click when restocked'
							: 'Click to add to next shop'
				}
				class={`gap-1.5 min-w-[10rem] ${
					v === 'reminder'
						? 'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500'
						: ''
				}`}
			>
				{#if v === 'buy'}
					<ShoppingCart class="size-3.5" />
					Buy at next shop
				{:else if v === 'reminder'}
					<Bell class="size-3.5" />
					Reminder!
				{:else}
					<Check class="size-3.5" />
					Stocked!
				{/if}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				aria-label="Archive"
				onclick={() => archive(item)}
			>
				<Archive class="size-4" />
			</Button>
		</div>
	</li>
{/snippet}
