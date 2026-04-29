<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Plus from '@lucide/svelte/icons/plus';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import Bell from '@lucide/svelte/icons/bell';
	import Check from '@lucide/svelte/icons/check';
	import Archive from '@lucide/svelte/icons/archive';
	import ColorPicker from '$lib/components/ColorPicker.svelte';
	import ColorTrigger from '$lib/components/ColorTrigger.svelte';
	import OptionTrigger from '$lib/components/OptionTrigger.svelte';
	import { paletteHex, paletteLabel, type PaletteToken } from '$lib/palette';
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
	let newColor = $state<PaletteToken | null>(null);
	let busy = $state<Record<string, boolean>>({});

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
			.sort((a, b) => (a.nextAt?.getTime() ?? Infinity) - (b.nextAt?.getTime() ?? Infinity));
		const stocked = annotated
			.filter((a) => a.visual === 'stocked')
			.slice()
			.sort((a, b) => {
				const at = a.item.last_purchased_at ? new Date(a.item.last_purchased_at).getTime() : 0;
				const bt = b.item.last_purchased_at ? new Date(b.item.last_purchased_at).getTime() : 0;
				return at - bt;
			});
		return { buy, reminder, stocked };
	});

	// Sub-group annotated rows by color token within their status section.
	// Order within a colour group preserves the section's primary order.
	function colorGroups(rows: Annotated[]) {
		const map = new Map<string, Annotated[]>();
		for (const r of rows) {
			const key = r.item.color ?? '__none';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(r);
		}
		// Stable color order: keyed groups first (palette order), uncoloured last.
		const order = ['slate', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple'];
		const out: { token: string | null; rows: Annotated[] }[] = [];
		for (const tok of order) {
			if (map.has(tok)) out.push({ token: tok, rows: map.get(tok)! });
		}
		if (map.has('__none')) out.push({ token: null, rows: map.get('__none')! });
		return out;
	}

	async function setStatus(item: ShoppingItem, next: ShoppingStatus) {
		busy[item.id] = true;
		const prev = { ...item };
		const optimistic: Partial<ShoppingItem> = { status: next };
		if (next === 'stocked') optimistic.last_purchased_at = new Date().toISOString();
		userData.updateShoppingItem(item.id, optimistic);

		try {
			const res = await fetch('/food/shopping/api', {
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

	function cycleStatus(a: Annotated) {
		if (a.visual === 'buy') return setStatus(a.item, 'stocked');
		if (a.visual === 'reminder') return setStatus(a.item, 'stocked');
		return setStatus(a.item, 'buy');
	}

	async function setPeriod(item: ShoppingItem, period: ShoppingPeriod) {
		const prev = { ...item };
		userData.updateShoppingItem(item.id, { restock_period: period });
		try {
			const res = await fetch('/food/shopping/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setPeriod', id: item.id, restock_period: period })
			});
			if (!res.ok) throw new Error(await res.text());
		} catch {
			userData.updateShoppingItem(item.id, prev);
		}
	}

	async function setColor(item: ShoppingItem, color: PaletteToken | null) {
		const prev = { ...item };
		userData.updateShoppingItem(item.id, { color });
		try {
			const res = await fetch('/food/shopping/api', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ op: 'setColor', id: item.id, color })
			});
			if (!res.ok) throw new Error();
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
		return `Due ${relativeDays(a.nextAt)}`;
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
				if (result.type === 'success') {
					showNew = false;
					newColor = null;
				}
			}}
		class="space-y-3 rounded-lg border bg-muted/20 p-4"
	>
		<div class="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
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
		</div>
		<div class="space-y-1.5">
			<Label class="text-xs">Color group</Label>
			<ColorPicker bind:value={newColor} name="color" label="Color group" />
		</div>
		{#if form?.error}
			<p class="text-sm text-destructive">{form.error}</p>
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
			{@render coloredList(colorGroups(grouped.buy), '')}
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
			{@render coloredList(
				colorGroups(grouped.reminder),
				'border-amber-300/60 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5'
			)}
		</section>
	{/if}

	<!-- Stocked -->
	{#if grouped.stocked.length > 0}
		<section class="space-y-2">
			<h3
				class="flex items-center gap-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
			>
				<Check class="size-3.5" />
				Stocked · {grouped.stocked.length}
			</h3>
			{@render coloredList(colorGroups(grouped.stocked), '')}
		</section>
	{/if}
{/if}

{#snippet coloredList(groups: { token: string | null; rows: Annotated[] }[], extraClass: string)}
	<div class="space-y-3">
		{#each groups as g (g.token ?? '__none')}
			{@const hex = paletteHex(g.token)}
			{#if groups.length > 1 && g.token}
				<div
					class="flex items-center gap-2 px-1 text-[10px] tracking-widest text-muted-foreground uppercase"
				>
					<span class="size-2 rounded-full" style={`background:${hex}`} aria-hidden="true"></span>
					{paletteLabel(g.token)}
				</div>
			{:else if groups.length > 1 && !g.token}
				<div class="px-1 text-[10px] tracking-widest text-muted-foreground uppercase">
					Ungrouped
				</div>
			{/if}
			<ul class={`divide-y divide-border rounded-lg border ${extraClass}`}>
				{#each g.rows as a (a.item.id)}
					{@render row(a)}
				{/each}
			</ul>
		{/each}
	</div>
{/snippet}

{#snippet row(a: Annotated)}
	{@const item = a.item}
	{@const v = a.visual}
	<li class="flex items-center gap-3 p-3">
		<ColorTrigger
			value={(item.color as PaletteToken | null) ?? null}
			onchange={(c) => setColor(item, c)}
			label="Change color group"
		/>

		<div class="min-w-0 flex-1 space-y-0.5">
			<div class="font-medium">{item.name}</div>
			<div class="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-muted-foreground">
				<span>{lastPurchasedLabel(item.last_purchased_at)}</span>
				{#if item.last_purchased_at && v !== 'buy'}
					<span aria-hidden="true">·</span>
					<span>{nextDueLabel(a)}</span>
				{/if}
				<span aria-hidden="true">·</span>
				<OptionTrigger
					value={item.restock_period}
					options={SHOPPING_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
					onchange={(next) => setPeriod(item, next as ShoppingPeriod)}
					label="Change restock period"
				/>
			</div>
		</div>

		<div class="flex items-center gap-1">
			<Button
				onclick={() => cycleStatus(a)}
				size="sm"
				variant={v === 'stocked' ? 'outline' : 'default'}
				disabled={busy[item.id]}
				title={v === 'buy'
					? 'Click when bought'
					: v === 'reminder'
						? 'Click when restocked'
						: 'Click to add to next shop'}
				class={`min-w-[10rem] gap-1.5 ${
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
