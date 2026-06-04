<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ShoppingCart from '@lucide/svelte/icons/shopping-cart';
	import PackageCheck from '@lucide/svelte/icons/package-check';
	import Eraser from '@lucide/svelte/icons/eraser';
	import { useUserData, type ShoppingListItem } from '$lib/stores/userData.svelte';
	import { normalizeName } from '$lib/shopping-list';

	const userData = useUserData();

	let newName = $state('');
	let adding = $state(false);
	let clearing = $state(false);
	let error = $state('');

	const items = $derived(
		userData.shoppingListItems.slice().sort((a, b) => {
			if (a.checked !== b.checked) return a.checked ? 1 : -1;
			return a.created_at.localeCompare(b.created_at);
		})
	);
	const checkedCount = $derived(items.filter((i) => i.checked).length);
	const supplyLinkCount = $derived(
		userData.shoppingListItems.filter((i) => i.supply_item_id).length
	);

	const SOURCE_LABELS: Record<string, string> = { supply: 'Supplies', recipe: 'Recipe' };

	async function post(payload: unknown): Promise<Response> {
		return fetch('/food/shopping-list/api', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
	}

	async function addItem(e: SubmitEvent) {
		e.preventDefault();
		const name = newName.trim();
		if (!name) return;
		error = '';

		if (userData.shoppingListNames().has(normalizeName(name))) {
			error = `"${name}" is already on the list.`;
			return;
		}

		newName = '';
		adding = true;
		try {
			const res = await post({ op: 'add', items: [{ name, source: 'manual' }] });
			if (!res.ok) throw new Error(await res.text());
			const body = (await res.json()) as { items: ShoppingListItem[] };
			userData.addShoppingListItems(body.items);
		} catch {
			error = 'Could not add that item.';
			newName = name;
		} finally {
			adding = false;
		}
	}

	async function toggle(item: ShoppingListItem) {
		const next = !item.checked;
		userData.updateShoppingListItem(item.id, { checked: next });
		try {
			const res = await post({ op: 'toggle', id: item.id, checked: next });
			if (!res.ok) throw new Error();
		} catch {
			userData.updateShoppingListItem(item.id, { checked: !next });
		}
	}

	async function remove(item: ShoppingListItem) {
		userData.removeShoppingListItem(item.id);
		try {
			const res = await post({ op: 'remove', id: item.id });
			if (!res.ok) throw new Error();
		} catch {
			userData.addShoppingListItems([item]);
		}
	}

	async function clearList() {
		if (!confirm('Clear the whole shopping list?')) return;
		const prev = userData.shoppingListItems;
		userData.clearShoppingList();
		clearing = true;
		try {
			const res = await post({ op: 'clear' });
			if (!res.ok) throw new Error();
		} catch {
			userData.addShoppingListItems(prev);
			error = 'Could not clear the list.';
		} finally {
			clearing = false;
		}
	}

	async function clearAndStock() {
		if (
			!confirm(
				`Clear the list and mark ${supplyLinkCount} supply item${
					supplyLinkCount === 1 ? '' : 's'
				} as stocked?`
			)
		)
			return;
		clearing = true;
		try {
			const res = await post({ op: 'clearAndStock' });
			if (!res.ok) throw new Error();
			const body = (await res.json()) as { stockedIds: string[] };
			const now = new Date().toISOString();
			for (const id of body.stockedIds) {
				userData.updateShoppingItem(id, { status: 'stocked', last_purchased_at: now });
			}
			userData.clearShoppingList();
		} catch {
			error = 'Could not clear and restock.';
		} finally {
			clearing = false;
		}
	}
</script>

<header class="flex flex-wrap items-end justify-between gap-3">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold tracking-tight">Shopping list</h2>
		<p class="text-sm text-muted-foreground">
			Your live list for the next shop — booted from Supplies, pulled from recipes, or typed in.
		</p>
	</div>
</header>

<form onsubmit={addItem} class="flex gap-2">
	<Input
		bind:value={newName}
		placeholder="Add something to buy…"
		class="flex-1"
		disabled={adding}
	/>
	<Button type="submit" disabled={adding || !newName.trim()}>
		<Plus class="size-4" />
		<span>Add</span>
	</Button>
</form>

{#if error}
	<p class="text-sm text-destructive">{error}</p>
{/if}

{#if items.length === 0}
	<div class="rounded-lg border border-dashed p-12 text-center">
		<ShoppingCart class="mx-auto mb-3 size-10 text-muted-foreground/60" />
		<p class="text-sm text-muted-foreground">
			Nothing to buy yet. Add items above, boot your <a class="underline" href="/food/supplies"
				>Supplies</a
			>
			Buy list over, or add a recipe's ingredients from
			<a class="underline" href="/food/recipes">Recipes</a>.
		</p>
	</div>
{:else}
	<div class="space-y-3">
		<div class="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
			<span>
				{items.length} item{items.length === 1 ? '' : 's'}{#if checkedCount > 0}
					· {checkedCount} ticked{/if}
			</span>
		</div>

		<ul class="divide-y divide-border rounded-lg border">
			{#each items as item (item.id)}
				<li class="flex items-stretch text-sm">
					<button
						type="button"
						onclick={() => toggle(item)}
						class="flex flex-1 items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/40"
					>
						<span
							class={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${
								item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
							}`}
							aria-hidden="true"
						>
							{#if item.checked}✓{/if}
						</span>
						<span class={`flex-1 ${item.checked ? 'text-muted-foreground line-through' : ''}`}>
							{item.name}
						</span>
						{#if SOURCE_LABELS[item.source]}
							<Badge variant="secondary" class="text-[10px]">{SOURCE_LABELS[item.source]}</Badge>
						{/if}
					</button>
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						class="my-auto mr-2 opacity-60 hover:opacity-100"
						aria-label="Remove item"
						onclick={() => remove(item)}
					>
						<Trash2 class="size-3.5" />
					</Button>
				</li>
			{/each}
		</ul>

		<div class="flex flex-wrap items-center justify-end gap-2 pt-1">
			<Button variant="outline" size="sm" onclick={clearList} disabled={clearing}>
				<Eraser class="size-4" />
				<span>Clear list</span>
			</Button>
			<Button size="sm" onclick={clearAndStock} disabled={clearing || supplyLinkCount === 0}>
				<PackageCheck class="size-4" />
				<span>Clear & mark supplies stocked</span>
			</Button>
		</div>
	</div>
{/if}
